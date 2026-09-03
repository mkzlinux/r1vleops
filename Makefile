PY := backend/.venv/bin/python
PIP := backend/.venv/bin/pip

.PHONY: install build serve dev clean

## Create venv + install backend deps + build the UI
install:
	python3 -m venv backend/.venv
	$(PIP) install -r backend/requirements.txt
	cd frontend && npm install

## Build the frontend into backend/app/static
build:
	cd frontend && npm run build

## Run the single FastAPI process on :8000 (serves API + built UI)
serve:
	$(PY) backend/run.py

## Build UI then serve everything from one process (best default)
dev: build serve

clean:
	rm -rf backend/.venv frontend/node_modules frontend/dist backend/app/static backend/data/*.db
