# Template Engine — plan d'architecture

> **Mise à jour — moteur 3D.** Depuis la refonte Three.js, les appareils sont
> de vrais modèles WebGL (`engine3d/`) : l'iPhone vient du GLB source préparé
> par `backend/scripts/prepare-devices.mjs`, le MacBook est modélisé avec une
> vraie hiérarchie charnière. Les templates `iphone-hero` et `macbook-hero`
> tournent dessus ; les dix templates précédents restent sur le moteur CSS 3D
> (`engine/`). La galerie n'affiche que des previews pré-rendues (poster +
> boucle MP4) ; l'éditeur monte une seule scène. Le reste de ce document
> décrit l'architecture commune (slots, contrat `TemplateInput`, miroir
> frontend, rendu par format), qui n'a pas changé.

Refonte du produit : d'un générateur « URL → IA → vidéo » vers un **studio de
publicités motion design à base de templates premium**. L'utilisateur choisit
d'abord une animation, puis y injecte son produit.

```
TEMPLATE → CONTENU (site / app / upload) → CAPTURE → [analyse IA optionnelle]
        → CHOIX & ORDRE DES ÉCRANS → INJECTION → RENDU → MP4
```

---

## 1. État des lieux

### À conserver tel quel

| Bloc | Pourquoi |
| --- | --- |
| **Playwright** (`playwright.service.ts`) | La capture mobile + desktop avec scoring des sections est exactement ce qu'il faut pour alimenter les slots « écrans ». Inchangé. |
| **Sessions d'upload** (`session.service.ts`, `storage.service.ts`) | Les octets restent côté serveur, le client manipule des URLs. Le logo et les screenshots App Store s'y rangent naturellement. |
| **File d'attente et jobs** (`jobs/*`) | Sérielle en mémoire par défaut, Bull/Redis en option, timeout 10 min. Le rendu reste un job asynchrone pollé. |
| **FFmpeg** (`ffmpeg.service.ts`) | Remux `+faststart` et extraction du poster. Le recadrage 9:16 → autres formats **n'est plus utilisé** (voir §9). |
| **Leviers mémoire** (`env.ts`) | `RENDER_CONCURRENCY`, `VIDEO_SHORT_EDGE`, `VIDEO_CRF`, `X264_PRESET`. Un rendu par format reste sous le même budget. |
| **CORS, logging, gestion d'erreurs, Dockerfile, Vercel** | Rien à changer. |
| **Détection des deux Chromium** (`browsers.ts`) | Playwright et Remotion ont besoin de binaires différents ; déjà résolu. |

### À refactorer

| Bloc | Quoi |
| --- | --- |
| **`backend/remotion/src/`** | Devient un module **autonome** (aucun import vers `backend/src`) pour pouvoir être copié tel quel dans le frontend et joué par `@remotion/player`. Les types et constantes dont il a besoin y emménagent. |
| **`remotion.service.ts`** | `renderVideo(storyboard)` → `renderTemplate({ templateId, aspects, input })`. Un rendu natif par format déclaré par le template. |
| **`/api/generate`** | Nouveau contrat : `{ templateId, aspects, input }`. Plus de storyboard. |
| **`/api/upload`** | Accepte en plus `logo` (data URI) et `appStoreUrl`. |
| **Types `VideoOutputs`** | De trois clés obligatoires à `Partial<Record<AspectRatio, string>>` : on ne rend que les formats demandés. |
| **Frontend** | Le studio à quatre étapes est remplacé par **Galerie → Éditeur**. Le store, l'API client et le polling sont réutilisés. |

### À remplacer

| Bloc | Remplacé par |
| --- | --- |
| `DeviceAnimationComposition` + `IPhoneAnimated` / `MacbookAnimated` / `DesktopAnimated` / `ScreenCarousel` / `phases.ts` | Le moteur (`engine/`) et dix templates. Ce qui marche dedans — la géométrie du capot, le défilement des captures, les cycles premiers entre eux — est **absorbé** dans les primitives, pas jeté. |
| `SceneText` / `SceneEffects` / `BrandChip` / `BackgroundLayer` / `theme.ts` / `animations.ts` | `engine/content/Copy`, `engine/scene/Environment`, `engine/motion/easing`. |
| Le flux UI capture → concept → customise → download | Galerie → éditeur → rendu. |

### Déprioritisé, conservé dans le code

`claude.service.ts` (analyse vision + storyboards), `schemas.ts`, `coerce.ts`,
`json.ts`, `storyboard.service.ts`, `/api/storyboards`. L'analyse reste
appelée **en enrichissement optionnel** (nom de marque, palette — avec son
fallback DOM sans clé). Les storyboards ne sont plus dans le flux ; ils
deviennent la future fonctionnalité « créer automatiquement une pub ».

---

## 2. Architecture des templates

Un template est **un module indépendant** : un dossier, un fichier
`index.tsx`, un export `template: TemplateDefinition`. Il est enregistré en
l'ajoutant à une liste. Rien d'autre à toucher.

```
backend/remotion/src/
├── index.ts                     registerRoot
├── Root.tsx                     enregistre template × format
├── engine/
│   ├── types.ts                 TemplateDefinition, TemplateInput, slots, formats
│   ├── registry.ts              TEMPLATES, getTemplate(id), compositionId(id, aspect)
│   ├── aspect.ts                dimensions par format, FPS
│   ├── placeholders.ts          contenu de démonstration (écrans + logo « vides »)
│   ├── motion/
│   │   ├── easing.ts            courbes premium, stagger, segments
│   │   ├── keyframes.ts         interpolation multi-keyframes avec easing par segment
│   │   └── camera.ts            caméra 3D : dolly, orbite, tilt, roll → transform CSS
│   ├── scene/
│   │   ├── Stage.tsx            perspective, sol, lumière d'ambiance, vignette, grain
│   │   ├── Environment.tsx      fond, key light, rim light, poussière
│   │   └── Floor.tsx            ombre de contact, reflet au sol
│   ├── devices/
│   │   ├── specs.ts             dimensions physiques, bezels, coins
│   │   ├── MacBook.tsx          capot articulé, plateau, épaisseur, glow d'écran
│   │   ├── IPhone.tsx           corps avec tranche, verre, Dynamic Island
│   │   └── Monitor.tsx          dalle, pied, reflet
│   └── content/
│       ├── Screen.tsx           capture ajustée à l'écran ; scroll, zoom, transitions
│       ├── ScreenSequence.tsx   quel écran à quel moment, transitions entre eux
│       ├── Logo.tsx             logo contain-fit, animations de reveal
│       ├── Copy.tsx             titre / sous-titre
│       ├── StoreBadges.tsx      badges App Store / Google Play
│       └── EndCard.tsx          URL + QR code + logo
└── templates/
    ├── index.ts                 la liste — ajouter une ligne pour ajouter un template
    ├── macbook-open/index.tsx
    ├── macbook-orbit/index.tsx
    └── …
```

### Règle d'autonomie

`remotion/src/` **n'importe rien** en dehors de lui-même et de `remotion` /
`react`. Pas de `process.env`, pas de `node:*`, pas de `../../src`. C'est ce
qui permet de le copier dans le frontend (§10) et de le jouer dans un
navigateur.

Le backend, lui, importe depuis `remotion/src/engine/` (types, registre)
pour valider les requêtes et choisir les compositions.

---

## 3. `TemplateDefinition`

```ts
export interface TemplateDefinition {
  id: string;                      // "macbook-open" — stable, sert d'id de composition
  name: string;                    // "MacBook — Cinematic Open"
  tagline: string;                 // une ligne pour la carte
  category: "laptop" | "phone" | "desktop" | "duo" | "logo";
  devices: DeviceKind[];           // ce que la scène montre
  durationInFrames: number;        // déterministe, à 30 fps
  aspects: AspectRatio[];          // les compositions réellement écrites
  slots: SlotSpec;                 // ce que le template accepte (§4)
  component: React.FC<TemplateInput>;
}
```

Le template **est** son animation. Caméra, appareil, perspective, lumière,
mouvements, timings, easing, transitions : tout est dans `component`, écrit
à la main, image par image déterministe. Aucun LLM n'en décide.

---

## 4. Système de slots

Un slot est un emplacement que l'utilisateur remplit. Le template déclare
lesquels il a et l'éditeur n'affiche que ceux-là.

```ts
export interface SlotSpec {
  screens: { min: number; max: number; surface: "mobile" | "desktop" | "any" };
  logo: "required" | "optional" | "none";
  headline: boolean;
  subline: boolean;
  cta: boolean;                    // end card URL + QR
  accent: boolean;                 // le template utilise la couleur de marque
  duration: { min: number; max: number } | null;   // secondes, si ajustable
}
```

Le contenu injecté :

```ts
export interface TemplateInput {
  screens: ImageAsset[];           // dans l'ordre choisi par l'utilisateur
  logo: ImageAsset | null;
  brand: { name: string; primary: string; accent: string };
  copy: { headline: string; subline: string };
  cta: CallToAction | null;        // { headline, url, hint, qrCode }
  durationInFrames?: number;       // seulement si slots.duration
}
export interface ImageAsset { id: string; url: string; width: number; height: number }
```

Ce sont **les `inputProps` Remotion**, identiques en rendu serveur et en
preview navigateur. Un template reçoit toujours un input complet : le
backend applique les placeholders aux slots vides pour que le composant
n'ait jamais à gérer l'absence.

---

## 5. Système d'animations

Trois briques, toutes pures et testables sans navigateur.

**Keyframes** — la primitive de base :

```ts
kf(frame, [
  { at: 0,  value: -105 },
  { at: 60, value: 8, easing: ease.cinematicOut },
  { at: 90, value: 4, easing: ease.settle },
]);
```

**Caméra** — un état `{ dolly, orbitY, orbitX, x, y, roll }` interpolé par
keyframes et converti en une seule chaîne `transform` appliquée au
`Stage`. Orbiter, pousser, incliner se combinent sans que chaque template
recalcule de la trigonométrie.

**Easing** — une petite bibliothèque nommée : `cinematicIn/Out/InOut`
(bezier lents aux extrémités), `settle` (léger dépassement amorti),
`anticipate` (recul avant départ), `snap` (rapide, pour les changements
d'écran). Un template n'écrit jamais `cubic-bezier(...)` en dur.

**Motion blur** — `@remotion/motion-blur` (`CameraMotionBlur`) sur les
segments de caméra rapides uniquement, et désactivé en preview navigateur
(`getRemotionEnvironment().isPlayer`) : il multiplie le coût par frame.

**Profondeur** — les éléments d'arrière-plan reçoivent un `filter: blur()`
proportionnel à leur distance caméra (faux depth of field, peu coûteux).

---

## 6. Système de preview

Deux niveaux, tous deux dans le navigateur avec `@remotion/player` :

1. **Galerie** — chaque carte joue le template avec les **placeholders**
   (appareil « vide », écrans neutres). `<Thumbnail>` pour l'image fixe ;
   le `<Player>` ne se monte qu'au survol ou quand la carte est visible
   (`IntersectionObserver`) : dix players à 30 fps en simultané, c'est un
   ventilateur.
2. **Éditeur** — le même `<Player>` avec le **contenu de l'utilisateur**.
   Changer l'ordre des écrans, le logo, le titre : la preview réagit
   instantanément, sans job serveur. C'est le « voir son produit dans
   l'animation » de la promesse.

Le rendu final utilise exactement le même composant : ce qu'on prévisualise
est ce qu'on obtient.

---

## 7. Système de rendu

```
POST /api/generate { templateId, aspects: ["9:16","1:1"], input }
  → validation : le template existe, les formats sont dans template.aspects,
    les slots requis sont remplis
  → job en file
  → pour chaque format : selectComposition(`${templateId}--${aspect}`)
                         renderMedia (concurrency, short edge, crf depuis env)
                         remux +faststart
  → poster depuis la première sortie
  → outputs: { "9:16": url, "1:1": url }
```

Un rendu **natif par format**. Le template est composé pour chaque ratio
qu'il déclare ; on ne recadre plus. Le coût est linéaire au nombre de
formats demandés, donc l'éditeur les fait choisir (un seul par défaut).

`Root.tsx` enregistre `TEMPLATES × template.aspects` compositions. La durée
vient de `template.durationInFrames` (ou de `input.durationInFrames` si le
slot existe) via `calculateMetadata`.

---

## 8. Gestion des screenshots

Sources, toutes convergeant vers des `ImageAsset` en session :

| Source | Chemin |
| --- | --- |
| URL de site | Playwright, comme aujourd'hui : hero + sections, mobile et desktop |
| URL App Store | Extraction de l'id (`/id\d+`) → `itunes.apple.com/lookup` → `screenshotUrls[]` + `artworkUrl512` téléchargés en session. Si le lookup échoue : scrape de la page avec Playwright. L'upload manuel reste toujours disponible. |
| Upload | PNG/JPG/WebP, jusqu'à 8 Mo chacun |

L'éditeur montre toutes les captures disponibles et laisse **choisir et
ordonner** celles qui entrent dans les slots. Le template déclare la surface
qu'il attend (`mobile` pour un iPhone, `desktop` pour un MacBook) et
l'éditeur pré-sélectionne en conséquence.

Dans l'écran, `Screen.tsx` ajuste la capture en largeur et fait défiler ce
qui dépasse (plafonné à ~1,15 hauteur d'écran par slide pour que ça lise
comme un scroll, pas un flou). Une capture plus courte que l'écran dérive
légèrement au lieu de rester figée.

---

## 9. Gestion du logo

Le logo est un élément du système, pas une option. Upload (PNG/SVG/WebP/JPG)
ou icône App Store récupérée automatiquement, rangé en session comme
`ImageAsset` avec ses dimensions réelles.

`Logo.tsx` le place dans une boîte de slot en `object-fit: contain` —
**jamais** étiré. Reveals disponibles : fondu + montée, masque, scale
depuis le centre. Les templates « logo intro », « logo + device » et « end
card » l'utilisent ; les autres le posent en signature discrète en coin
quand il est fourni.

`brand.primary` / `brand.accent` (de l'analyse ou choisis à la main) teintent
l'environnement des templates qui déclarent `slots.accent`.

---

## 10. Gestion des formats

Un template déclare ce qu'il sait composer. Un template MacBook n'est pas
obligé d'offrir du 9:16 si l'ordinateur y serait minuscule ; un template
téléphone peut ne pas offrir le 16:9. L'éditeur n'affiche que les formats
déclarés.

À l'intérieur d'un composant, `useVideoConfig()` donne la taille, et un
helper `layoutFor(aspect)` renvoie les zones (appareil, texte, logo) pour
que la composition soit **repensée** par format, pas mise à l'échelle.

---

## 11. Ajouter un template

1. Créer `templates/<id>/index.tsx`.
2. Exporter `template: TemplateDefinition` avec son `component`.
3. L'ajouter à la liste dans `templates/index.ts`.
4. `npm run video:sync` pour le miroir frontend (§12).

Il apparaît dans la galerie, dans `Root.tsx` et dans `/api/templates` sans
autre modification. Une suite de tests vérifie chaque template : durée > 0,
au moins un format, slots cohérents, id unique.

---

## 12. Séparation frontend / backend

**Source de vérité :** `backend/remotion/src/`. Le backend le bundle et le
rend.

**Frontend :** `frontend/src/video/` est une **copie verbatim** produite par
`scripts/sync-video.mjs`, commitée. Pas de package partagé, pas de lien
symbolique : Vercel construit depuis `frontend/` et ne voit pas `../backend`,
Railway construit depuis `backend/` et ne voit pas `../frontend`. Une copie
commitée est la seule chose qui déploie sans toucher aux réglages des deux
plateformes. C'est déjà le choix fait pour les types (`frontend/src/types`).

Un test (`sync-video --check`) échoue si les deux divergent ; il tourne
avec `lint` là où les deux dossiers existent.

**Contrat entre les deux :** `TemplateDefinition` (métadonnées) et
`TemplateInput` (contenu). Le frontend lit le registre localement pour la
galerie et la preview ; le backend expose le même registre sur
`GET /api/templates` pour que l'éditeur puisse vérifier qu'il parle à une
version compatible.

---

## 13. Les dix premiers templates

Visuellement distincts, chacun une idée de mise en scène :

| # | Id | Scène |
| --- | --- | --- |
| 1 | `macbook-open` | Studio sombre, MacBook fermé de trois quarts. Le capot s'ouvre, l'écran éclaire le plateau, la caméra pousse dans l'écran, les captures s'enchaînent avec parallaxe, recul, signature logo. |
| 2 | `macbook-orbit` | MacBook ouvert, la caméra orbite de 30° autour puis zoome jusqu'à ce que l'écran remplisse le cadre. |
| 3 | `macbook-fullframe` | L'écran occupe le cadre dès le départ, bords du châssis à peine visibles, dolly lent, captures qui glissent avec parallaxe. |
| 4 | `iphone-rise` | Le téléphone monte du bas en tournant de 180° (dos → face), se pose de trois quarts, les écrans changent, flottement. |
| 5 | `iphone-perspective` | Téléphone posé en perspective raide, la caméra plonge et s'aligne jusqu'à l'écran plein cadre. |
| 6 | `iphone-rapid` | Face caméra, changements d'écran rapides et rythmés avec glissement, le téléphone accuse chaque coup. |
| 7 | `duo` | MacBook derrière, iPhone devant incliné, entrées décalées, la caméra dérive entre les deux. |
| 8 | `monitor-pushin` | Écran de bureau sur un plan, push-in lent avec rotation infime, fond en flou de profondeur. |
| 9 | `phone-float` | Téléphone en lévitation, culbute lente, poussière, rim light, l'écran change à chaque demi-tour. |
| 10 | `logo-reveal` | Reveal du logo, l'appareil scale derrière, sortie sur badges store et QR. |

Ordre de construction : 1, 4, 8 d'abord (un par famille d'appareil, ce qui
valide les trois primitives), puis les sept autres.

---

## 14. Ordre de travail

| Phase | Livrable | Vérification |
| --- | --- | --- |
| 3 | Moteur : types, registre, easing, keyframes, caméra, Stage, trois appareils, Screen, Logo, Root | typecheck, tests unitaires sur keyframes/caméra/registre |
| 4 | `macbook-open`, `iphone-rise`, `monitor-pushin` | stills aux frames clés + un MP4 complet chacun |
| 5 | `TemplateInput` de bout en bout : `/api/templates`, `/api/generate`, logo dans `/api/upload`, rendu par format | run réel via l'API |
| 6 | Miroir `frontend/src/video`, galerie, éditeur avec `<Player>` | Playwright sur l'UI |
| 7 | Les sept autres templates | stills chacun |
| 8–9 | Site → écrans → template ; App Store → écrans + icône → template | run réel |
| 10–11 | Polish, docs, rendu réel de trois templates | lint / typecheck / tests verts, push |

Chaque phase est un commit. Rien n'est supprimé avant que son remplaçant
rende.
