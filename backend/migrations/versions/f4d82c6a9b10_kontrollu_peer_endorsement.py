"""Meslektaş ilişkilendirmelerinde kontrollü bağlam kanıtları."""

from alembic import op

revision = "f4d82c6a9b10"
down_revision = "e8b37a4c6d21"
branch_labels = None
depends_on = None

NEW_CONTEXTS = (
    "'worked_together', 'same_training_program', 'supervision_context', "
    "'referred_client_to', 'received_client_referral', "
    "'follows_professional_work', 'referral_relationship'"
)
OLD_CONTEXTS = (
    "'worked_together', 'training', 'supervision', "
    "'referral_relationship', 'professional_work'"
)
TRANSITION_CONTEXTS = f"{OLD_CONTEXTS}, {NEW_CONTEXTS}"


def _replace_constraint(contexts: str) -> None:
    with op.batch_alter_table("peer_specialty_associations") as batch:
        batch.drop_constraint(
            "ck_peer_specialty_associations_context",
            type_="check",
        )
        batch.create_check_constraint(
            "ck_peer_specialty_associations_context",
            f"profesyonel_baglam IN ({contexts})",
        )


def upgrade():
    _replace_constraint(TRANSITION_CONTEXTS)
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'same_training_program' "
        "WHERE profesyonel_baglam = 'training'"
    )
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'supervision_context' "
        "WHERE profesyonel_baglam = 'supervision'"
    )
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'follows_professional_work' "
        "WHERE profesyonel_baglam = 'professional_work'"
    )
    _replace_constraint(NEW_CONTEXTS)


def downgrade():
    _replace_constraint(TRANSITION_CONTEXTS)
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'training' "
        "WHERE profesyonel_baglam = 'same_training_program'"
    )
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'supervision' "
        "WHERE profesyonel_baglam = 'supervision_context'"
    )
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'referral_relationship' "
        "WHERE profesyonel_baglam IN "
        "('referred_client_to', 'received_client_referral')"
    )
    op.execute(
        "UPDATE peer_specialty_associations "
        "SET profesyonel_baglam = 'professional_work' "
        "WHERE profesyonel_baglam = 'follows_professional_work'"
    )
    _replace_constraint(OLD_CONTEXTS)
