FROM python:3.12-slim AS build
WORKDIR /app
RUN pip install --no-cache-dir uv==0.12.13
COPY pyproject.toml uv.lock ./
COPY app ./app
RUN uv sync --locked --no-dev --no-editable

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONUTF8=1 PYTHONDONTWRITEBYTECODE=1
ENV PATH="/app/.venv/bin:$PATH"
WORKDIR /app
RUN useradd --system --uid 10001 --create-home terapist
COPY --from=build /app/.venv /app/.venv
COPY app ./app
COPY migrations ./migrations
COPY scripts ./scripts
COPY alembic.ini ./
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-access-log", "--no-proxy-headers"]
