FROM python:3.8-slim

RUN pip install poetry
WORKDIR /srv/python

COPY pyproject.toml poetry.lock ./
RUN poetry install
RUN poetry run python -m spacy download en_core_web_sm

COPY . .
RUN poetry install

CMD poetry run flask run --host 0.0.0.0 --port 3000