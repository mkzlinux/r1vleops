#!/usr/bin/env python3
"""Entrypoint. Usage:
    python run.py            # default 0.0.0.0:8000
    python run.py --port 9000
"""
import argparse
import uvicorn


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8000)
    args = p.parse_args()
    uvicorn.run("app.main:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
