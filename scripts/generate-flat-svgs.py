#!/usr/bin/env python3
"""Preserva e verifica o catÃ¡logo de SVGs curados do Longyu.

Os assets agora sÃ£o vetores curados a partir de referÃªncias geradas. Este
script mantÃ©m o antigo ponto de entrada sem sobrescrever as ilustraÃ§Ãµes.
"""

from __future__ import annotations

from pathlib import Path


CURATED_ASSETS = (
    "people/person.svg",
    "people/mouth.svg",
    "people/woman.svg",
    "people/child.svg",
    "people/mother.svg",
    "people/father.svg",
    "people/friend.svg",
    "people/crowd.svg",
    "nature/tree.svg",
    "nature/sun.svg",
    "nature/moon.svg",
    "nature/mountain.svg",
    "nature/water.svg",
    "nature/fire.svg",
    "nature/sky.svg",
    "nature/woods.svg",
    "nature/forest.svg",
    "nature/horse.svg",
    "daily-life/fish.svg",
    "daily-life/rice.svg",
    "daily-life/tea.svg",
    "daily-life/meat.svg",
    "daily-life/vegetables.svg",
    "actions/eat.svg",
    "actions/drink.svg",
    "objects/book.svg",
    "objects/car.svg",
    "objects/home.svg",
    "objects/money.svg",
    "objects/ticket.svg",
    "daily-life/one.svg",
    "daily-life/two.svg",
    "daily-life/three.svg",
    "daily-life/four.svg",
    "daily-life/five.svg",
    "daily-life/big.svg",
    "daily-life/small.svg",
)


def main() -> None:
    root = Path("src/assets/visuals")
    missing = [relative for relative in CURATED_ASSETS if not (root / relative).is_file()]
    if missing:
        raise FileNotFoundError("Assets curados ausentes: " + ", ".join(missing))

    for relative in CURATED_ASSETS:
        print(f"preserved {relative}")
    print(f"TOTAL {len(CURATED_ASSETS)}")


if __name__ == "__main__":
    main()

