import personPhoto from "./people/person.webp";
import treePhoto from "./nature/tree.webp";
import mouthPhoto from "./people/mouth.webp";
import sunPhoto from "./nature/sun.webp";
import moonPhoto from "./nature/moon.webp";
import mountainPhoto from "./nature/mountain.webp";
import waterPhoto from "./nature/water.webp";
import firePhoto from "./nature/fire.webp";
import bigIllustration from "./daily-life/big.webp";
import smallIllustration from "./daily-life/small.webp";
import type { VisualConceptId } from "../../data/visualVocabulary";
import type { VisualSceneId } from "../../data/visualScenes";

export const VISUAL_IMAGE_SRC_BY_ID: Record<VisualConceptId, string> = {
  person: personPhoto,
  tree: treePhoto,
  mouth: mouthPhoto,
  sun: sunPhoto,
  moon: moonPhoto,
  mountain: mountainPhoto,
  water: waterPhoto,
  fire: firePhoto,
  big: bigIllustration,
  small: smallIllustration,
};

/** Mapa de cenas visuais — reutiliza fotos locais por cena. */
export const VISUAL_SCENE_IMAGE_SRC_BY_ID: Record<VisualSceneId, string> = {
  tree_single: treePhoto,
  person_single: personPhoto,
  water_glass: waterPhoto,
  fire_small: firePhoto,
  sun_sky: sunPhoto,
  moon_night: moonPhoto,
  mountain_landscape: mountainPhoto,
  person_drinking_water: waterPhoto,
  two_people_greeting: personPhoto,
  person_saying_thanks: personPhoto,
  person_leaving: personPhoto,
  classroom_greeting: personPhoto,
};
