#!/usr/bin/env python3
"""Gera SVGs flat 600x600 para o catálogo visual Longyu."""

from __future__ import annotations

from pathlib import Path

BG = "#EEF3EE"
GROUND = "#D5E4D7"
ACCENT = "#B9412E"
ACCENT_SOFT = "#D46A57"
SKIN = "#E8C4A8"
HAIR = "#5C4033"
HAIR_LIGHT = "#8B6540"
BROWN = "#8B6540"
BROWN_DARK = "#6E5235"
CREAM = "#F5E8D0"
BLUE = "#7EB4D4"
BLUE_DARK = "#5B9BC4"
GREEN = "#5A8B68"
GREEN_LIGHT = "#8BB89A"
GOLD = "#E8A84A"
GOLD_SOFT = "#F0C070"
PINK_BG = "#F5E8E6"
PINK_GROUND = "#E8D0CC"
NAVY = "#4A5F7A"
TEAL = "#5A8B8B"
MUTED_GREEN = "#6FA07D"
CHARCOAL = "#3A3F45"
GREY = "#9AA3A8"
GREY_LIGHT = "#C5CCD0"
CARROT = "#E07840"
FISH_BG = "#E4F0F5"


def svg(content: str, label: str = "Illustration") -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" '
        f'viewBox="0 0 600 600" role="img" aria-label="{label}">\n'
        f"{content}\n"
        "</svg>\n"
    )


def bg(ground: str = GROUND, sky: str = BG, gy: int = 470) -> str:
    return (
        f'  <rect width="600" height="600" fill="{sky}"/>\n'
        f'  <rect y="{gy}" width="600" height="{600 - gy}" fill="{ground}"/>'
    )


def apple(cx: int, cy: int, r: int = 55) -> str:
    return (
        f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{ACCENT}"/>\n'
        f'  <circle cx="{cx - 14}" cy="{cy - 14}" r="{int(r * 0.28)}" fill="{ACCENT_SOFT}"/>\n'
        f'  <rect x="{cx - 5}" y="{cy - r - 18}" width="10" height="22" rx="3" fill="{BROWN}"/>\n'
        f'  <ellipse cx="{cx + 16}" cy="{cy - r - 8}" rx="18" ry="10" fill="{GREEN}"/>'
    )


def build() -> dict[str, str]:
    assets: dict[str, str] = {}

    assets["people/person.svg"] = svg(
        f"""{bg()}
  <rect x="230" y="300" width="140" height="180" rx="28" fill="{NAVY}"/>
  <rect x="250" y="320" width="100" height="70" rx="12" fill="{CREAM}"/>
  <circle cx="300" cy="210" r="78" fill="{HAIR}"/>
  <circle cx="300" cy="220" r="58" fill="{SKIN}"/>
  <circle cx="278" cy="215" r="5" fill="{CHARCOAL}"/>
  <circle cx="322" cy="215" r="5" fill="{CHARCOAL}"/>
  <path d="M285 240 Q300 252 315 240" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="230" cy="380" rx="28" ry="18" fill="{SKIN}"/>
  <ellipse cx="370" cy="380" rx="28" ry="18" fill="{SKIN}"/>""",
        "Person",
    )

    assets["people/mouth.svg"] = svg(
        f"""  <rect width="600" height="600" fill="{BG}"/>
  <ellipse cx="300" cy="310" rx="150" ry="90" fill="{SKIN}"/>
  <ellipse cx="300" cy="320" rx="88" ry="42" fill="{ACCENT}"/>
  <ellipse cx="300" cy="308" rx="78" ry="22" fill="{ACCENT_SOFT}"/>
  <path d="M230 318 Q300 350 370 318" fill="{CREAM}"/>""",
        "Mouth",
    )

    assets["people/woman.svg"] = svg(
        f"""{bg(PINK_GROUND, PINK_BG)}
  <path d="M220 470 L250 300 L350 300 L380 470 Z" fill="{ACCENT}"/>
  <circle cx="300" cy="220" r="78" fill="{HAIR}"/>
  <path d="M230 200 Q300 150 370 200" fill="none" stroke="{HAIR_LIGHT}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="300" cy="230" r="55" fill="{SKIN}"/>
  <circle cx="282" cy="225" r="5" fill="{CHARCOAL}"/>
  <circle cx="318" cy="225" r="5" fill="{CHARCOAL}"/>
  <path d="M288 248 Q300 258 312 248" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>""",
        "Woman",
    )

    assets["people/child.svg"] = svg(
        f"""{bg()}
  <ellipse cx="300" cy="430" rx="90" ry="40" fill="{TEAL}"/>
  <rect x="240" y="300" width="120" height="130" rx="24" fill="{TEAL}"/>
  <circle cx="300" cy="230" r="62" fill="{SKIN}"/>
  <circle cx="255" cy="200" r="22" fill="{HAIR}"/>
  <circle cx="345" cy="200" r="22" fill="{HAIR}"/>
  <circle cx="300" cy="195" r="28" fill="{HAIR}"/>
  <circle cx="282" cy="225" r="4" fill="{CHARCOAL}"/>
  <circle cx="318" cy="225" r="4" fill="{CHARCOAL}"/>
  <path d="M288 245 Q300 254 312 245" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="400" cy="420" r="36" fill="{GOLD}"/>
  <circle cx="388" cy="408" r="10" fill="{GOLD_SOFT}"/>""",
        "Child",
    )

    assets["people/mother.svg"] = svg(
        f"""{bg(PINK_GROUND, PINK_BG)}
  <path d="M210 470 L240 290 L360 290 L390 470 Z" fill="{ACCENT}"/>
  <circle cx="300" cy="210" r="70" fill="{HAIR}"/>
  <circle cx="300" cy="218" r="50" fill="{SKIN}"/>
  <circle cx="282" cy="212" r="4" fill="{CHARCOAL}"/>
  <circle cx="318" cy="212" r="4" fill="{CHARCOAL}"/>
  <path d="M288 235 Q300 244 312 235" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="340" cy="360" rx="55" ry="42" fill="{CREAM}"/>
  <circle cx="360" cy="330" r="28" fill="{SKIN}"/>
  <circle cx="352" cy="328" r="3" fill="{CHARCOAL}"/>
  <circle cx="368" cy="328" r="3" fill="{CHARCOAL}"/>""",
        "Mother",
    )

    assets["people/father.svg"] = svg(
        f"""{bg()}
  <rect x="160" y="300" width="110" height="170" rx="22" fill="{NAVY}"/>
  <circle cx="215" cy="240" r="55" fill="{HAIR}"/>
  <circle cx="215" cy="248" r="40" fill="{SKIN}"/>
  <circle cx="202" cy="244" r="4" fill="{CHARCOAL}"/>
  <circle cx="228" cy="244" r="4" fill="{CHARCOAL}"/>
  <path d="M205 266 Q215 274 225 266" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>
  <rect x="340" y="360" width="80" height="110" rx="18" fill="{ACCENT_SOFT}"/>
  <circle cx="380" cy="320" r="40" fill="{HAIR_LIGHT}"/>
  <circle cx="380" cy="326" r="30" fill="{SKIN}"/>
  <circle cx="370" cy="322" r="3" fill="{CHARCOAL}"/>
  <circle cx="390" cy="322" r="3" fill="{CHARCOAL}"/>
  <rect x="260" y="380" width="90" height="18" rx="9" fill="{SKIN}"/>""",
        "Father",
    )

    assets["people/friend.svg"] = svg(
        f"""{bg()}
  <rect x="150" y="300" width="120" height="170" rx="24" fill="{MUTED_GREEN}"/>
  <circle cx="210" cy="240" r="58" fill="{HAIR}"/>
  <circle cx="210" cy="248" r="42" fill="{SKIN}"/>
  <circle cx="196" cy="244" r="4" fill="{CHARCOAL}"/>
  <circle cx="224" cy="244" r="4" fill="{CHARCOAL}"/>
  <path d="M198 268 Q210 276 222 268" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>
  <rect x="330" y="300" width="120" height="170" rx="24" fill="{ACCENT_SOFT}"/>
  <circle cx="390" cy="240" r="58" fill="{HAIR_LIGHT}"/>
  <circle cx="390" cy="248" r="42" fill="{SKIN}"/>
  <circle cx="376" cy="244" r="4" fill="{CHARCOAL}"/>
  <circle cx="404" cy="244" r="4" fill="{CHARCOAL}"/>
  <path d="M378 268 Q390 276 402 268" fill="none" stroke="{CHARCOAL}" stroke-width="3" stroke-linecap="round"/>
  <path d="M260 340 Q300 300 340 340" fill="none" stroke="{MUTED_GREEN}" stroke-width="22" stroke-linecap="round"/>""",
        "Friend",
    )

    # crowd.svg é um vetor curado a partir de referência gerada; preservar o arquivo existente.

    assets["objects/home.svg"] = svg(
        f"""{bg()}
  <rect x="150" y="280" width="300" height="200" fill="{CREAM}"/>
  <polygon points="130,280 300,140 470,280" fill="{ACCENT}"/>
  <rect x="380" y="160" width="40" height="70" fill="{ACCENT}"/>
  <rect x="265" y="360" width="70" height="120" rx="4" fill="{BROWN}"/>
  <circle cx="320" cy="420" r="6" fill="{GOLD}"/>
  <rect x="180" y="310" width="70" height="70" fill="{BROWN}"/>
  <rect x="190" y="320" width="22" height="22" fill="{BLUE}"/>
  <rect x="218" y="320" width="22" height="22" fill="{BLUE}"/>
  <rect x="190" y="348" width="22" height="22" fill="{BLUE}"/>
  <rect x="218" y="348" width="22" height="22" fill="{BLUE}"/>
  <rect x="350" y="310" width="70" height="70" fill="{BROWN}"/>
  <rect x="360" y="320" width="22" height="22" fill="{BLUE}"/>
  <rect x="388" y="320" width="22" height="22" fill="{BLUE}"/>
  <rect x="360" y="348" width="22" height="22" fill="{BLUE}"/>
  <rect x="388" y="348" width="22" height="22" fill="{BLUE}"/>""",
        "Home",
    )

    assets["objects/car.svg"] = svg(
        f"""{bg()}
  <path d="M90 380 L120 300 Q150 250 220 240 L380 240 Q450 250 480 300 L520 380 Z" fill="{ACCENT}"/>
  <rect x="90" y="370" width="430" height="70" rx="20" fill="{ACCENT}"/>
  <path d="M200 250 L240 300 L200 300 Z" fill="{BLUE}"/>
  <rect x="250" y="250" width="100" height="50" rx="8" fill="{BLUE}"/>
  <path d="M370 250 L410 300 L370 300 Z" fill="{BLUE}"/>
  <circle cx="170" cy="440" r="42" fill="{CHARCOAL}"/>
  <circle cx="170" cy="440" r="22" fill="{GREY_LIGHT}"/>
  <circle cx="430" cy="440" r="42" fill="{CHARCOAL}"/>
  <circle cx="430" cy="440" r="22" fill="{GREY_LIGHT}"/>
  <rect x="500" y="390" width="22" height="14" rx="4" fill="{GOLD_SOFT}"/>
  <circle cx="105" cy="395" r="8" fill="{ACCENT_SOFT}"/>""",
        "Car",
    )

    assets["objects/book.svg"] = svg(
        f"""{bg()}
  <ellipse cx="300" cy="480" rx="160" ry="28" fill="{GROUND}"/>
  <path d="M140 180 L300 200 L300 450 L140 420 Z" fill="{CREAM}"/>
  <path d="M460 180 L300 200 L300 450 L460 420 Z" fill="{CREAM}"/>
  <path d="M140 180 L300 200 L460 180 L460 160 L300 180 L140 160 Z" fill="{ACCENT}"/>
  <rect x="292" y="195" width="16" height="255" fill="{ACCENT_SOFT}"/>
  <rect x="170" y="250" width="90" height="10" rx="4" fill="{GREY}"/>
  <rect x="170" y="280" width="70" height="10" rx="4" fill="{GREY}"/>
  <rect x="170" y="310" width="80" height="10" rx="4" fill="{GREY}"/>
  <rect x="340" y="250" width="90" height="10" rx="4" fill="{GREY}"/>
  <rect x="340" y="280" width="70" height="10" rx="4" fill="{GREY}"/>
  <rect x="340" y="310" width="80" height="10" rx="4" fill="{GREY}"/>""",
        "Book",
    )

    # Avoid f-string brace issues: dollar sign as plain text via concatenation.
    money_inner = (
        f"""{bg()}
  <ellipse cx="300" cy="470" rx="150" ry="30" fill="{GROUND}"/>
  <rect x="140" y="220" width="260" height="160" rx="16" fill="{GREEN}"/>
  <rect x="160" y="240" width="220" height="120" rx="10" fill="{GREEN_LIGHT}"/>
  <circle cx="270" cy="300" r="36" fill="{GREEN}"/>
  <circle cx="270" cy="300" r="18" fill="{CREAM}"/>
  <rect x="262" y="285" width="16" height="30" rx="3" fill="{GREEN}"/>
  <circle cx="400" cy="380" r="48" fill="{GOLD}"/>
  <circle cx="400" cy="380" r="32" fill="{GOLD_SOFT}"/>
  <circle cx="450" cy="340" r="40" fill="{GOLD}"/>
  <circle cx="450" cy="340" r="26" fill="{GOLD_SOFT}"/>"""
    )
    assets["objects/money.svg"] = svg(money_inner, "Money")

    assets["objects/ticket.svg"] = svg(
        f"""  <rect width="600" height="600" fill="{BG}"/>
  <rect x="100" y="200" width="400" height="200" rx="16" fill="{ACCENT}"/>
  <circle cx="100" cy="250" r="18" fill="{BG}"/>
  <circle cx="100" cy="300" r="18" fill="{BG}"/>
  <circle cx="100" cy="350" r="18" fill="{BG}"/>
  <circle cx="500" cy="250" r="18" fill="{BG}"/>
  <circle cx="500" cy="300" r="18" fill="{BG}"/>
  <circle cx="500" cy="350" r="18" fill="{BG}"/>
  <line x1="380" y1="220" x2="380" y2="380" stroke="{BG}" stroke-width="4" stroke-dasharray="12 10"/>
  <polygon points="220,260 250,300 220,340 190,300" fill="{GOLD_SOFT}"/>
  <circle cx="440" cy="300" r="36" fill="{CREAM}"/>
  <circle cx="440" cy="300" r="18" fill="{ACCENT}"/>""",
        "Ticket",
    )

    assets["daily-life/one.svg"] = svg(f"""{bg(GROUND, BG, 500)}\n{apple(300, 280, 90)}""", "One")
    assets["daily-life/two.svg"] = svg(
        f"""{bg(GROUND, BG, 500)}\n{apple(210, 300, 70)}\n{apple(390, 300, 70)}""", "Two"
    )
    assets["daily-life/three.svg"] = svg(
        f"""{bg(GROUND, BG, 500)}\n{apple(300, 200, 60)}\n{apple(200, 340, 60)}\n{apple(400, 340, 60)}""",
        "Three",
    )
    assets["daily-life/four.svg"] = svg(
        f"""{bg(GROUND, BG, 500)}\n{apple(200, 220, 55)}\n{apple(400, 220, 55)}\n{apple(200, 380, 55)}\n{apple(400, 380, 55)}""",
        "Four",
    )
    assets["daily-life/five.svg"] = svg(
        f"""{bg(GROUND, BG, 500)}\n{apple(300, 170, 50)}\n{apple(180, 280, 50)}\n{apple(420, 280, 50)}\n{apple(220, 410, 50)}\n{apple(380, 410, 50)}""",
        "Five",
    )

    assets["daily-life/big.svg"] = svg(
        f"""{bg()}
  <circle cx="300" cy="280" r="160" fill="{ACCENT}"/>
  <circle cx="240" cy="220" r="40" fill="{ACCENT_SOFT}"/>
  <rect x="430" y="400" width="50" height="50" rx="6" fill="{GREY}"/>""",
        "Big",
    )

    assets["daily-life/small.svg"] = svg(
        f"""{bg()}
  <rect x="160" y="160" width="280" height="280" rx="16" fill="{GREY}"/>
  <rect x="160" y="160" width="280" height="40" fill="{GREY_LIGHT}"/>
  <circle cx="420" cy="420" r="36" fill="{ACCENT}"/>
  <circle cx="408" cy="408" r="10" fill="{ACCENT_SOFT}"/>""",
        "Small",
    )

    assets["daily-life/fish.svg"] = svg(
        f"""  <rect width="600" height="600" fill="{FISH_BG}"/>
  <ellipse cx="300" cy="300" rx="140" ry="80" fill="{BLUE_DARK}"/>
  <polygon points="160,300 90,250 90,350" fill="{BLUE}"/>
  <circle cx="380" cy="280" r="14" fill="{CREAM}"/>
  <circle cx="384" cy="280" r="7" fill="{CHARCOAL}"/>
  <path d="M280 300 Q300 270 320 300 Q300 330 280 300" fill="{BLUE}"/>
  <circle cx="460" cy="200" r="18" fill="{BLUE}" opacity="0.45"/>
  <circle cx="500" cy="250" r="12" fill="{BLUE}" opacity="0.35"/>
  <circle cx="480" cy="160" r="10" fill="{BLUE}" opacity="0.3"/>""",
        "Fish",
    )

    assets["daily-life/rice.svg"] = svg(
        f"""{bg()}
  <ellipse cx="300" cy="420" rx="140" ry="40" fill="{BLUE_DARK}"/>
  <path d="M160 360 Q160 420 300 440 Q440 420 440 360 Z" fill="{BLUE}"/>
  <ellipse cx="300" cy="300" rx="130" ry="90" fill="{CREAM}"/>
  <circle cx="250" cy="280" r="8" fill="{BG}"/>
  <circle cx="300" cy="260" r="7" fill="{BG}"/>
  <circle cx="340" cy="290" r="8" fill="{BG}"/>
  <circle cx="280" cy="320" r="6" fill="{BG}"/>
  <circle cx="320" cy="310" r="7" fill="{BG}"/>
  <rect x="400" y="200" width="14" height="200" rx="4" fill="{BROWN}" transform="rotate(18 407 300)"/>
  <rect x="430" y="200" width="14" height="200" rx="4" fill="{BROWN_DARK}" transform="rotate(18 437 300)"/>""",
        "Rice",
    )

    assets["daily-life/tea.svg"] = svg(
        f"""{bg()}
  <ellipse cx="300" cy="450" rx="100" ry="28" fill="{GROUND}"/>
  <path d="M200 280 L210 420 Q300 460 390 420 L400 280 Z" fill="{CREAM}"/>
  <ellipse cx="300" cy="280" rx="100" ry="30" fill="{CREAM}"/>
  <ellipse cx="300" cy="290" rx="80" ry="22" fill="{GREEN}"/>
  <path d="M270 200 Q280 240 275 270" fill="none" stroke="{GREY}" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
  <path d="M300 190 Q310 235 305 270" fill="none" stroke="{GREY}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>
  <path d="M330 200 Q340 240 335 270" fill="none" stroke="{GREY}" stroke-width="8" stroke-linecap="round" opacity="0.5"/>""",
        "Tea",
    )

    assets["daily-life/meat.svg"] = svg(
        f"""  <rect width="600" height="600" fill="{PINK_BG}"/>
  <ellipse cx="300" cy="300" rx="160" ry="110" fill="{ACCENT}"/>
  <ellipse cx="300" cy="300" rx="70" ry="90" fill="{CREAM}"/>
  <path d="M200 260 Q240 280 200 320" fill="none" stroke="{ACCENT_SOFT}" stroke-width="8" stroke-linecap="round"/>
  <path d="M400 250 Q360 290 400 330" fill="none" stroke="{ACCENT_SOFT}" stroke-width="8" stroke-linecap="round"/>
  <path d="M280 360 Q300 380 320 360" fill="none" stroke="{ACCENT_SOFT}" stroke-width="6" stroke-linecap="round"/>""",
        "Meat",
    )

    assets["daily-life/vegetables.svg"] = svg(
        f"""{bg()}
  <ellipse cx="230" cy="340" rx="55" ry="120" fill="{CREAM}"/>
  <path d="M200 220 Q220 160 230 120" fill="none" stroke="{GREEN}" stroke-width="14" stroke-linecap="round"/>
  <path d="M230 220 Q250 150 270 110" fill="none" stroke="{GREEN_LIGHT}" stroke-width="14" stroke-linecap="round"/>
  <path d="M250 220 Q280 170 300 140" fill="none" stroke="{GREEN}" stroke-width="12" stroke-linecap="round"/>
  <path d="M380 200 L420 420 L340 420 Z" fill="{CARROT}"/>
  <path d="M380 200 Q360 150 340 120" fill="none" stroke="{GREEN}" stroke-width="12" stroke-linecap="round"/>
  <path d="M380 200 Q390 140 410 110" fill="none" stroke="{GREEN_LIGHT}" stroke-width="12" stroke-linecap="round"/>
  <path d="M380 200 Q400 155 430 130" fill="none" stroke="{GREEN}" stroke-width="10" stroke-linecap="round"/>""",
        "Vegetables",
    )

    # eat.svg e drink.svg são vetores curados a partir de referências geradas; preservar os arquivos existentes.

    # horse.svg é um vetor curado a partir de referência gerada; preservar o arquivo existente.\n\n    return assets


def main() -> None:
    root = Path("src/assets/visuals")
    assets = build()
    for rel, content in assets.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
        print(f"wrote {rel} ({path.stat().st_size} B)")
    print(f"TOTAL {len(assets)}")


if __name__ == "__main__":
    main()
