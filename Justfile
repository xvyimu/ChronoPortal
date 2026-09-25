set shell := ["pwsh", "-NoProfile", "-Command"]

default:
    @just --list

install:
    pnpm install

dev:
    pnpm dev

lint:
    pnpm lint

typecheck:
    pnpm typecheck

test:
    pnpm test

e2e:
    pnpm e2e

build:
    pnpm build

docs:
    pnpm check:docs

security:
    pnpm audit:security

check: lint typecheck test
