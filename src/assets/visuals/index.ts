// Keep lesson visuals inside the JavaScript bundle so larger SVGs never fall back because of a missing deployed asset.
import personIllustration from "./people/person.svg?raw";
import treeIllustration from "./nature/tree.svg?raw";
import mouthIllustration from "./people/mouth.svg?raw";
import sunIllustration from "./nature/sun.svg?raw";
import moonIllustration from "./nature/moon.svg?raw";
import mountainIllustration from "./nature/mountain.svg?raw";
import waterIllustration from "./nature/water.svg?raw";
import fireIllustration from "./nature/fire.svg?raw";
import bigIllustration from "./daily-life/big.svg?raw";
import smallIllustration from "./daily-life/small.svg?raw";
import womanIllustration from "./people/woman.svg?raw";
import childIllustration from "./people/child.svg?raw";
import motherIllustration from "./people/mother.svg?raw";
import fatherIllustration from "./people/father.svg?raw";
import friendIllustration from "./people/friend.svg?raw";
import crowdIllustration from "./people/crowd.svg?raw";
import skyIllustration from "./nature/sky.svg?raw";
import woodsIllustration from "./nature/woods.svg?raw";
import forestIllustration from "./nature/forest.svg?raw";
import horseIllustration from "./nature/horse.svg?raw";
import fishIllustration from "./daily-life/fish.svg?raw";
import riceIllustration from "./daily-life/rice.svg?raw";
import teaIllustration from "./daily-life/tea.svg?raw";
import meatIllustration from "./daily-life/meat.svg?raw";
import vegetablesIllustration from "./daily-life/vegetables.svg?raw";
import eatIllustration from "./actions/eat.svg?raw";
import drinkIllustration from "./actions/drink.svg?raw";
import bookIllustration from "./objects/book.svg?raw";
import carIllustration from "./objects/car.svg?raw";
import homeIllustration from "./objects/home.svg?raw";
import moneyIllustration from "./objects/money.svg?raw";
import ticketIllustration from "./objects/ticket.svg?raw";
import oneIllustration from "./daily-life/one.svg?raw";
import twoIllustration from "./daily-life/two.svg?raw";
import threeIllustration from "./daily-life/three.svg?raw";
import fourIllustration from "./daily-life/four.svg?raw";
import fiveIllustration from "./daily-life/five.svg?raw";
import type { VisualConceptId } from "../../data/visualVocabulary";

function visualSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const VISUAL_IMAGE_SRC_BY_ID: Record<VisualConceptId, string> = {
  person: visualSvgDataUrl(personIllustration),
  tree: visualSvgDataUrl(treeIllustration),
  mouth: visualSvgDataUrl(mouthIllustration),
  sun: visualSvgDataUrl(sunIllustration),
  moon: visualSvgDataUrl(moonIllustration),
  mountain: visualSvgDataUrl(mountainIllustration),
  water: visualSvgDataUrl(waterIllustration),
  fire: visualSvgDataUrl(fireIllustration),
  big: visualSvgDataUrl(bigIllustration),
  small: visualSvgDataUrl(smallIllustration),
  woman: visualSvgDataUrl(womanIllustration),
  child: visualSvgDataUrl(childIllustration),
  mother: visualSvgDataUrl(motherIllustration),
  father: visualSvgDataUrl(fatherIllustration),
  friend: visualSvgDataUrl(friendIllustration),
  crowd: visualSvgDataUrl(crowdIllustration),
  sky: visualSvgDataUrl(skyIllustration),
  woods: visualSvgDataUrl(woodsIllustration),
  forest: visualSvgDataUrl(forestIllustration),
  horse: visualSvgDataUrl(horseIllustration),
  fish: visualSvgDataUrl(fishIllustration),
  rice: visualSvgDataUrl(riceIllustration),
  tea: visualSvgDataUrl(teaIllustration),
  meat: visualSvgDataUrl(meatIllustration),
  vegetables: visualSvgDataUrl(vegetablesIllustration),
  eat: visualSvgDataUrl(eatIllustration),
  drink: visualSvgDataUrl(drinkIllustration),
  book: visualSvgDataUrl(bookIllustration),
  car: visualSvgDataUrl(carIllustration),
  home: visualSvgDataUrl(homeIllustration),
  money: visualSvgDataUrl(moneyIllustration),
  ticket: visualSvgDataUrl(ticketIllustration),
  one: visualSvgDataUrl(oneIllustration),
  two: visualSvgDataUrl(twoIllustration),
  three: visualSvgDataUrl(threeIllustration),
  four: visualSvgDataUrl(fourIllustration),
  five: visualSvgDataUrl(fiveIllustration),
};
