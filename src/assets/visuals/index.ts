// Keep lesson visuals inside the JavaScript bundle so larger SVGs never fall back because of a missing deployed asset.
import personIllustration from "./people/person.svg?inline";
import treeIllustration from "./nature/tree.svg?inline";
import mouthIllustration from "./people/mouth.svg?inline";
import sunIllustration from "./nature/sun.svg?inline";
import moonIllustration from "./nature/moon.svg?inline";
import mountainIllustration from "./nature/mountain.svg?inline";
import waterIllustration from "./nature/water.svg?inline";
import fireIllustration from "./nature/fire.svg?inline";
import bigIllustration from "./daily-life/big.svg?inline";
import smallIllustration from "./daily-life/small.svg?inline";
import womanIllustration from "./people/woman.svg?inline";
import childIllustration from "./people/child.svg?inline";
import motherIllustration from "./people/mother.svg?inline";
import fatherIllustration from "./people/father.svg?inline";
import friendIllustration from "./people/friend.svg?inline";
import crowdIllustration from "./people/crowd.svg?inline";
import skyIllustration from "./nature/sky.svg?inline";
import woodsIllustration from "./nature/woods.svg?inline";
import forestIllustration from "./nature/forest.svg?inline";
import horseIllustration from "./nature/horse.svg?inline";
import fishIllustration from "./daily-life/fish.svg?inline";
import riceIllustration from "./daily-life/rice.svg?inline";
import teaIllustration from "./daily-life/tea.svg?inline";
import meatIllustration from "./daily-life/meat.svg?inline";
import vegetablesIllustration from "./daily-life/vegetables.svg?inline";
import eatIllustration from "./actions/eat.svg?inline";
import drinkIllustration from "./actions/drink.svg?inline";
import bookIllustration from "./objects/book.svg?inline";
import carIllustration from "./objects/car.svg?inline";
import homeIllustration from "./objects/home.svg?inline";
import moneyIllustration from "./objects/money.svg?inline";
import ticketIllustration from "./objects/ticket.svg?inline";
import oneIllustration from "./daily-life/one.svg?inline";
import twoIllustration from "./daily-life/two.svg?inline";
import threeIllustration from "./daily-life/three.svg?inline";
import fourIllustration from "./daily-life/four.svg?inline";
import fiveIllustration from "./daily-life/five.svg?inline";
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
  crowd: crowdIllustration,
  sky: skyIllustration,
  woods: woodsIllustration,
  forest: forestIllustration,
  horse: horseIllustration,
  fish: fishIllustration,
  rice: riceIllustration,
  tea: teaIllustration,
  meat: meatIllustration,
  vegetables: vegetablesIllustration,
  eat: eatIllustration,
  drink: drinkIllustration,
  book: bookIllustration,
  car: carIllustration,
  home: homeIllustration,
  money: moneyIllustration,
  ticket: ticketIllustration,
  one: oneIllustration,
  two: twoIllustration,
  three: threeIllustration,
  four: fourIllustration,
  five: fiveIllustration,
};
