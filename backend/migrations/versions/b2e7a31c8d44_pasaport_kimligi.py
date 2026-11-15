"""Pasaport kimliği ve yönlendirme ağı görünürlüğü."""

import sqlalchemy as sa
from alembic import op

revision = "b2e7a31c8d44"
down_revision = "a1c6f9d42e30"
branch_labels = None
depends_on = None


def upgrade():
    for name, length in [
        ("unvan", 100),
        ("profil_fotografi_url", 1000),
        ("egitim_universite", 150),
        ("egitim_program", 150),
        ("egitim_derece", 100),
    ]:
        op.add_column(
            "uzmanlar",
            sa.Column(
                name,
                sa.String(length=length),
                nullable=False,
                server_default="",
            ),
        )
    op.add_column(
        "uzmanlar",
        sa.Column(
            "yonlendirme_agini_goster",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade():
    op.drop_column("uzmanlar", "yonlendirme_agini_goster")
    for name in [
        "egitim_derece",
        "egitim_program",
        "egitim_universite",
        "profil_fotografi_url",
        "unvan",
    ]:
        op.drop_column("uzmanlar", name)
