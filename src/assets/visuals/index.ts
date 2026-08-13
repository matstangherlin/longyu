// Vite-managed asset URLs (hashed files) — not inlined data URIs.
// Large VTracer illustrations stay cacheable and load in parallel.
import personIllustration from "./people/person.svg";
import treeIllustration from "./nature/tree.svg";
import mouthIllustration from "./people/mouth.svg";
import sunIllustration from "./nature/sun.svg";
import moonIllustration from "./nature/moon.svg";
import mountainIllustration from "./nature/mountain.svg";
import waterIllustration from "./nature/water.svg";
import fireIllustration from "./nature/fire.svg";
import bigIllustration from "./daily-life/big.svg";
import smallIllustration from "./daily-life/small.svg";
import womanIllustration from "./people/woman.svg";
import childIllustration from "./people/child.svg";
import motherIllustration from "./people/mother.svg";
import fatherIllustration from "./people/father.svg";
import friendIllustration from "./people/friend.svg";
import sonIllustration from "./people/son.webp";
import daughterIllustration from "./people/daughter.webp";
import olderBrotherIllustration from "./people/older-brother.webp";
import olderSisterIllustration from "./people/older-sister.webp";
import femaleFriendIllustration from "./people/female-friend.webp";
import girlfriendIllustration from "./people/girlfriend.webp";
import boyfriendIllustration from "./people/boyfriend.webp";
import crowdIllustration from "./people/crowd.svg";
import skyIllustration from "./nature/sky.svg";
import woodsIllustration from "./nature/woods.svg";
import forestIllustration from "./nature/forest.svg";
import horseIllustration from "./nature/horse.svg";
import fishIllustration from "./daily-life/fish.svg";
import catIllustration from "./animals/cat.webp";
import dogIllustration from "./animals/dog.webp";
import riceIllustration from "./daily-life/rice.svg";
import teaIllustration from "./daily-life/tea.svg";
import coffeeIllustration from "./daily-life/coffee.webp";
import milkIllustration from "./daily-life/milk.webp";
import appleIllustration from "./daily-life/apple.webp";
import meatIllustration from "./daily-life/meat.svg";
import vegetablesIllustration from "./daily-life/vegetables.svg";
import eatIllustration from "./actions/eat.svg";
import drinkIllustration from "./actions/drink.svg";
import bookIllustration from "./objects/book.svg";
import carIllustration from "./objects/car.svg";
import homeIllustration from "./objects/home.svg";
import moneyIllustration from "./objects/money.svg";
import ticketIllustration from "./objects/ticket.svg";
import phoneIllustration from "./objects/phone.webp";
import keysIllustration from "./objects/keys.webp";
import cupIllustration from "./objects/cup.webp";
import tableIllustration from "./objects/table.webp";
import chairIllustration from "./objects/chair.webp";
import doorIllustration from "./objects/door.webp";
import windowIllustration from "./objects/window.webp";
import backpackIllustration from "./objects/backpack.webp";
import bathroomIllustration from "./places/bathroom.webp";
import bedroomIllustration from "./places/bedroom.webp";
import kitchenIllustration from "./places/kitchen.webp";
import travelIllustration from "./daily-life/travel.webp";
import waterSurvivalIllustration from "./daily-life/water.webp";
import juiceIllustration from "./daily-life/juice.webp";
import beerIllustration from "./daily-life/beer.webp";
import noodlesIllustration from "./daily-life/noodles.webp";
import breadIllustration from "./daily-life/bread.webp";
import bananaIllustration from "./daily-life/banana.webp";
import eggIllustration from "./daily-life/egg.webp";
import menuIllustration from "./objects/menu.webp";
import hotelKeyCardIllustration from "./objects/hotel-key-card.webp";
import passportIllustration from "./objects/passport.webp";
import luggageIllustration from "./objects/luggage.webp";
import billIllustration from "./objects/bill.webp";
import bankCardIllustration from "./objects/bank-card.webp";
import hotelIllustration from "./places/hotel.webp";
import streetIllustration from "./places/street.webp";
import supermarketIllustration from "./places/supermarket.webp";
import restaurantIllustration from "./places/restaurant.webp";
import bankIllustration from "./places/bank.webp";
import shoppingMallIllustration from "./places/shopping-mall.webp";
import airportIllustration from "./places/airport.webp";
import hospitalIllustration from "./places/hospital.webp";
import taxiIllustration from "./transport/taxi.webp";
import busIllustration from "./transport/bus.webp";
import trainIllustration from "./transport/train.webp";
import metroIllustration from "./transport/metro.webp";
import airplaneIllustration from "./transport/airplane.webp";
import oneIllustration from "./daily-life/one.svg";
import twoIllustration from "./daily-life/two.svg";
import threeIllustration from "./daily-life/three.svg";
import fourIllustration from "./daily-life/four.svg";
import fiveIllustration from "./daily-life/five.svg";
import type { VisualConceptId } from "../../data/visualVocabulary";

export const VISUAL_IMAGE_SRC_BY_ID: Record<VisualConceptId, string> = {
  person: personIllustration,
  tree: treeIllustration,
  mouth: mouthIllustration,
  sun: sunIllustration,
  moon: moonIllustration,
  mountain: mountainIllustration,
  water: waterIllustration,
  fire: fireIllustration,
  big: bigIllustration,
  small: smallIllustration,
  woman: womanIllustration,
  child: childIllustration,
  mother: motherIllustration,
  father: fatherIllustration,
  friend: friendIllustration,
  son: sonIllustration,
  daughter: daughterIllustration,
  older_brother: olderBrotherIllustration,
  older_sister: olderSisterIllustration,
  female_friend: femaleFriendIllustration,
  girlfriend: girlfriendIllustration,
  boyfriend: boyfriendIllustration,
  crowd: crowdIllustration,
  sky: skyIllustration,
  woods: woodsIllustration,
  forest: forestIllustration,
  horse: horseIllustration,
  fish: fishIllustration,
  cat: catIllustration,
  dog: dogIllustration,
  rice: riceIllustration,
  tea: teaIllustration,
  coffee: coffeeIllustration,
  milk: milkIllustration,
  apple: appleIllustration,
  meat: meatIllustration,
  vegetables: vegetablesIllustration,
  eat: eatIllustration,
  drink: drinkIllustration,
  drinking_water: waterSurvivalIllustration,
  book: bookIllustration,
  car: carIllustration,
  home: homeIllustration,
  money: moneyIllustration,
  ticket: ticketIllustration,
  phone: phoneIllustration,
  keys: keysIllustration,
  cup: cupIllustration,
  table: tableIllustration,
  chair: chairIllustration,
  door: doorIllustration,
  window: windowIllustration,
  backpack: backpackIllustration,
  bathroom: bathroomIllustration,
  bedroom: bedroomIllustration,
  kitchen: kitchenIllustration,
  travel: travelIllustration,
  juice: juiceIllustration,
  beer: beerIllustration,
  noodles: noodlesIllustration,
  bread: breadIllustration,
  banana: bananaIllustration,
  egg: eggIllustration,
  menu: menuIllustration,
  hotel_key_card: hotelKeyCardIllustration,
  passport: passportIllustration,
  luggage: luggageIllustration,
  bill: billIllustration,
  bank_card: bankCardIllustration,
  hotel: hotelIllustration,
  street: streetIllustration,
  supermarket: supermarketIllustration,
  restaurant: restaurantIllustration,
  bank: bankIllustration,
  shopping_mall: shoppingMallIllustration,
  airport: airportIllustration,
  hospital: hospitalIllustration,
  taxi: taxiIllustration,
  bus: busIllustration,
  train: trainIllustration,
  metro: metroIllustration,
  airplane: airplaneIllustration,
  one: oneIllustration,
  two: twoIllustration,
  three: threeIllustration,
  four: fourIllustration,
  five: fiveIllustration,
};
