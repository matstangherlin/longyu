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
import greetingScene from "./actions/greeting.webp";
import thankingScene from "./actions/thanking.webp";
import farewellScene from "./actions/farewell.webp";
import introduceNameScene from "./actions/introduce-name.webp";
import drinkWaterScene from "./actions/drink-water.webp";
import pointTreeScene from "./actions/point-tree.webp";
import lookMountainScene from "./actions/look-mountain.webp";
import classroomScene from "./classroom/classroom.webp";
import confusedScene from "./actions/confused.webp";
import requestRepeatScene from "./actions/request-repeat.webp";
import bigSmallScene from "./objects/big-small.webp";
import countUnitsScene from "./objects/count-units.webp";
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

export const VISUAL_SCENE_IMAGE_SRC_BY_ID: Record<VisualSceneId, string> = {
  "scene-greeting": greetingScene,
  "scene-thanking": thankingScene,
  "scene-farewell": farewellScene,
  "scene-introduce-name": introduceNameScene,
  "scene-drink-water": drinkWaterScene,
  "scene-point-tree": pointTreeScene,
  "scene-look-mountain": lookMountainScene,
  "scene-classroom": classroomScene,
  "scene-confused": confusedScene,
  "scene-request-repeat": requestRepeatScene,
  "scene-big-small": bigSmallScene,
  "scene-count-units": countUnitsScene,
};

export function resolveLocalVisualSrc(imageSrc: string | undefined): string | undefined {
  if (!imageSrc) return undefined;
  const conceptHit = Object.entries(VISUAL_IMAGE_SRC_BY_ID).find(([, src]) => src.includes(imageSrc.split("/").pop() ?? ""));
  if (conceptHit) return conceptHit[1];
  const sceneHit = (Object.entries(VISUAL_SCENE_IMAGE_SRC_BY_ID) as [string, string][]).find(([, src]) =>
    src.includes(imageSrc.split("/").pop() ?? "")
  );
  return sceneHit?.[1];
}
