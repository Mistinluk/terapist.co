"""Kurucu terapist program ayari, sirali tahsis ve degismez kimlik."""

import time
import uuid

import sqlalchemy as sa
from alembic import op

revision = "a6d2e47c9b13"
down_revision = "f5c9d32b8a01"
branch_labels = None
depends_on = None


def _create_immutability_triggers(dialect: str) -> None:
    if dialect == "sqlite":
        op.execute(
            "CREATE TRIGGER founding_members_immutable_update "
            "BEFORE UPDATE OF uzman_id, kurucu_no ON founding_members "
            "BEGIN SELECT RAISE(ABORT, 'Founder ID is immutable'); END"
        )
        op.execute(
            "CREATE TRIGGER founding_members_immutable_delete "
            "BEFORE DELETE ON founding_members "
            "BEGIN SELECT RAISE(ABORT, 'Founder ID is immutable'); END"
        )
        return
    op.execute(
        "CREATE FUNCTION prevent_founding_member_mutation() "
        "RETURNS trigger AS $$ BEGIN "
        "IF TG_OP = 'DELETE' OR NEW.uzman_id <> OLD.uzman_id "
        "OR NEW.kurucu_no <> OLD.kurucu_no THEN "
        "RAISE EXCEPTION 'Founder ID is immutable'; END IF; "
        "RETURN NEW; END; $$ LANGUAGE plpgsql"
    )
    op.execute(
        "CREATE TRIGGER founding_members_immutable "
        "BEFORE UPDATE OR DELETE ON founding_members "
        "FOR EACH ROW EXECUTE FUNCTION prevent_founding_member_mutation()"
    )


def _drop_immutability_triggers(dialect: str) -> None:
    if dialect == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS founding_members_immutable_update")
        op.execute("DROP TRIGGER IF EXISTS founding_members_immutable_delete")
        return
    op.execute(
        "DROP TRIGGER IF EXISTS founding_members_immutable ON founding_members"
    )
    op.execute("DROP FUNCTION IF EXISTS prevent_founding_member_mutation()")


def upgrade():
    bind = op.get_bind()
    now = int(time.time())
    current_max = bind.execute(
        sa.text("SELECT MAX(kurucu_no) FROM founding_members")
    ).scalar()
    maximum = max(500, current_max or 0)
    op.create_table(
        "founding_program_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("azami_uye", sa.Integer(), nullable=False),
        sa.Column("guncelleme", sa.Integer(), nullable=False),
        sa.Column("guncelleyen_kullanici_id", sa.String(), nullable=True),
        sa.CheckConstraint(
            "id = 1", name="ck_founding_program_settings_singleton"
        ),
        sa.CheckConstraint(
            "azami_uye >= 0", name="ck_founding_program_settings_maximum"
        ),
        sa.ForeignKeyConstraint(
            ["guncelleyen_kullanici_id"], ["kullanicilar.id"]
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    bind.execute(
        sa.text(
            "INSERT INTO founding_program_settings "
            "(id, azami_uye, guncelleme, guncelleyen_kullanici_id) "
            "VALUES (1, :maximum, :updated, NULL)"
        ),
        {"maximum": maximum, "updated": now},
    )

    used = set(
        bind.execute(
            sa.text("SELECT kurucu_no FROM founding_members")
        ).scalars()
    )
    next_number = max(used, default=0) + 1
    candidates = bind.execute(
        sa.text(
            "SELECT u.id, u.kullanici_id, v.incelenme, v.gonderilme, "
            "v.inceleyen_kullanici_id FROM uzmanlar u "
            "JOIN therapist_verifications v ON v.uzman_id = u.id "
            "LEFT JOIN founding_members f ON f.uzman_id = u.id "
            "WHERE u.onayli = :approved AND u.arsivli = :archived "
            "AND v.durum = 'verified' AND f.id IS NULL "
            "ORDER BY COALESCE(v.incelenme, v.gonderilme), "
            "v.gonderilme, u.id"
        ),
        {"approved": True, "archived": False},
    ).mappings()
    for candidate in candidates:
        if next_number > maximum:
            break
        bind.execute(
            sa.text(
                "INSERT INTO founding_members "
                "(id, uzman_id, kurucu_no, verilme, veren_kullanici_id) "
                "VALUES (:id, :profile, :number, :assigned, :assigner)"
            ),
            {
                "id": str(uuid.uuid4()),
                "profile": candidate["id"],
                "number": next_number,
                "assigned": candidate["incelenme"]
                or candidate["gonderilme"]
                or now,
                "assigner": candidate["inceleyen_kullanici_id"]
                or candidate["kullanici_id"],
            },
        )
        next_number += 1
    _create_immutability_triggers(bind.dialect.name)


def downgrade():
    dialect = op.get_bind().dialect.name
    _drop_immutability_triggers(dialect)
    op.drop_table("founding_program_settings")
