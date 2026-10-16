import {
  Color3,
  PBRMaterial,
  Scene,
  Texture,
} from "@babylonjs/core";

/** Apply authored PBR maps to Blender GLB materials and fallback 3D props.
 *
 * This is a runtime material pass: GameState and collision mesh geometry stay
 * untouched. All textures are local and a missing texture falls back to
 * original flat material. Shared texture objects prevent per-desk duplication.
 */
export type TextureQuality = "2k" | "1k";
type Surface = "plaster" | "vinyl" | "wood" | "chalk" | "ceiling" | "metal";
const ASSET_ROOT = "/assets/textures/";

function surfaceFor(name: string): Surface | null {
  const n = name.toLowerCase();
  if (/^m_wall_ivory$|^wall$/.test(n)) return "plaster";
  if (/^m_floor_green_vinyl$|^floor$/.test(n)) return "vinyl";
  if (/^m_desk_wood$|^m_wood_|^desk$|^dark-wood$|^concept-worn-wood$/.test(n)) return "wood";
  if (/^m_blackboard$|^concept-deep-green-blackboard$/.test(n)) return "chalk";
  if (/^m_ceiling$|^ceiling$/.test(n)) return "ceiling";
  if (/^m_metal$|^m_aluminium_trim$|^m_door_bluegreen$|^metal$|^concept-metal-frame$/.test(n)) return "metal";
  return null;
}

export class HighResTextures {
  readonly quality: TextureQuality;
  private readonly maps = new Map<string, Texture>();

  constructor(private readonly scene: Scene, canUseLargeTextures: boolean) {
    this.quality = canUseLargeTextures && window.matchMedia("(pointer: fine)").matches
      ? "2k"
      : "1k";
  }

  apply(): number {
    let count = 0;
    for (const material of this.scene.materials) {
      const surface = surfaceFor(material.name);
      if (!surface || !(material instanceof PBRMaterial)) continue;
      const quality = this.quality === "2k" && (surface === "metal" || surface === "ceiling") ? "1k" : this.quality;
      const originalColor = material.albedoColor.clone();
      const originals = {
        color: material.albedoTexture,
        bump: material.bumpTexture,
        metal: material.metallicTexture,
        roughness: material.roughness,
        metallic: material.metallic,
      };
      const restore = () => {
        material.albedoTexture = originals.color;
        material.bumpTexture = originals.bump;
        material.metallicTexture = originals.metal;
        material.albedoColor = originalColor;
        material.roughness = originals.roughness;
        material.metallic = originals.metallic;
      };
      const albedo = this.getMap(surface, quality, "albedo", restore);
      const bump = this.getMap(surface, quality, "normal");
      const orm = this.getMap(surface, quality, "orm");
      material.albedoTexture = albedo;
      material.bumpTexture = bump;
      material.metallicTexture = orm;
      material.albedoColor = Color3.White();
      material.useRoughnessFromMetallicTextureGreen = true;
      material.useMetallnessFromMetallicTextureBlue = true;
      material.useAmbientOcclusionFromMetallicTextureRed = false;
      material.roughness = 1;
      material.metallic = 1;
      bump.level = surface === "vinyl" ? .42 : surface === "wood" ? .40 : .30;
      count++;
    }
    return count;
  }

  private getMap(surface: Surface, quality: TextureQuality, kind: "albedo" | "normal" | "orm", onError?: () => void): Texture {
    const key = [surface, quality, kind].join(":");
    let cached = this.maps.get(key);
    if (cached) return cached;
    const uri = ASSET_ROOT + surface + "-" + quality + "-" + kind + ".webp";
    cached = new Texture(uri, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE,
      undefined, (_msg, error) => {
        console.warn("PBR texture unavailable; using fallback:", uri, error);
        onError?.();
      });
    cached.wrapU = Texture.WRAP_ADDRESSMODE;
    cached.wrapV = Texture.WRAP_ADDRESSMODE;
    this.maps.set(key, cached);
    return cached;
  }
}
