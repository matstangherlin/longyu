# China survival benchmark

LONGYU_MINIMAL_CHINA_CONVERSATION (COMM-030/031/032)

Hard fail if a scenario requires vocabulary not present in Atlas/lifecycle.

| Scenario | Capabilities | Untaught refs | OK |
| --- | --- | --- | --- |
| airport | airport_basic, say_dont_understand, ask_repeat | — | yes |
| transport | use_metro, use_taxi, ask_location | — | yes |
| hotel | hotel_checkin | — | yes |
| restaurant | order_food, order_drink, ask_price, pay | — | yes |
| shopping | buy_item, ask_price, negotiate_basic | — | yes |
| directions | ask_directions, ask_location | — | yes |
| small-talk | greet, introduce_self, ask_name, express_preference | — | yes |
| communication-repair | say_dont_understand, ask_repeat, ask_for_help | — | yes |
| health-basic | health_basic, ask_for_help | — | yes |

## Simulated path

chegar à China → aeroporto → hotel → restaurante → metrô → loja → conhecer alguém → resolver problema simples.

1. aeroporto: airport_basic + say_dont_understand + ask_repeat
2. transporte: use_metro + use_taxi + ask_location
3. hotel: hotel_checkin
4. restaurante: order_food + order_drink + ask_price + pay
5. loja: buy_item + negotiate_basic
6. metrô: use_metro
7. pedir informação: ask_directions + ask_repeat
8. conhecer alguém: introduce_self + ask_name + say_origin + ask_origin
9. falar de si: greet + talk_family + express_preference
10. emergência simples: health_basic + ask_for_help

Benchmark scenarios clean: **9/9**
