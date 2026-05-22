# Guide des composants et du style

Référence pour une app **Vite + React + Tailwind v4 + shadcn/ui** (preset **Nova** en exemple). L’identité visuelle vise une **scène nocturne violette** façon **kawaii metal** (références d’ambiance type **Babymetal** (groupe de métal japonais) : contraste doux / agressif, lumières de plateau), avec **libellés en français** sur l’interface. Un **thème clair** complète l’offre : même AD (vermillon, or, violets), lisible en journée — détail au **§4.2** et **§5.2**.

---

## 1. Stack

| Élément | Rôle |
|--------|------|
| Tailwind v4 | `src/index.css` → `@import "tailwindcss"` |
| shadcn | `@import "shadcn/tailwind.css"`, thème en variables CSS |
| Animations | `tw-animate-css` |
| Polices | **Geist Variable** (corps UI), **Shippori Mincho** 400/700 (titres / affiche) |
| Thème sombre | `class="dark"` sur `<html>` + bloc `.dark` dans `index.css` |
| Thème clair | **`:root`** dans `index.css` (sans classe `dark`) ; bascule via `ThemeProvider` / stockage local |

Chemins types : `src/index.css`, composant racine (`App.tsx`), `components.json`, `index.html`.

---

## 2. Direction artistique (résumé)

- **Fond** : violet nuit profond, halos (nébuleuse, projecteur chaud), vignette bas d’écran — tout en **oklch** pour des transitions de teinte propres.
- **Contraste** : **vermillon** (`primary`) sur les actions et points chauds ; **or** (`accent` + `border`) pour le métal / le cadre ; surfaces **violettes** (`background`, `card`, `muted`…).
- **Surfaces** : cartes semi-translucides, **backdrop-blur**, ombres multicouches (filet doré + ombre violette + **glow** vermillon).
- **Contenu** : texte d’interface en **français** ; la mincho sert au **rendu** des titres, pas à imposer une locale.

**Thème clair** : même trio **vermillon / or / violet**, mais fond type **lilas-crème** plus lumineux ; cartes et popovers **plus clairs que le fond** pour le contraste ; halos et dégradés **pastel** (cf. **§5.2**).

### Mise en page — pleine largeur

- **Pas de cap global** type `max-w-5xl`, `max-w-6xl` ou `max-w-7xl` sur l’enveloppe principale : le contenu et le fond utilisent **toute la largeur du viewport** (`w-full`, pas de `max-w-*` sur le shell de page).
- **Respiration** : marges intérieures horizontales responsives (`px-4` → `px-8` / `lg:px-12` / `xl:px-16`, etc.) pour éviter le collage aux bords sur grands écrans.
- **Lisibilité ciblée** : si un paragraphe très long doit rester confortable à la lecture, poser un `max-w-prose` (ou similaire) **uniquement sur ce bloc**, jamais sur le conteneur qui porte toute la page.

---

## 3. Typographie (`@theme` dans `index.css`)

| Token | Police | Usage |
|-------|--------|-------|
| `font-sans` | Geist | Corps, formulaires, boutons |
| `font-jp` | Shippori Mincho (+ repli system-ui serif) | Titres, lignes d’accroche |
| `font-heading` | `var(--font-jp)` | Titres shadcn alignés sur la même ligne éditoriale |

Imports : `@fontsource-variable/geist`, `@fontsource/shippori-mincho/400.css`, `@fontsource/shippori-mincho/700.css`.

---

## 4. Tokens couleur (oklch)

Les composants shadcn lisent ces variables (définies dans `src/index.css`). **Deux jeux** : **`.dark`** (scène nocturne, référence historique du guide) et **`:root`** (scène diurne — même famille de teintes, tons adaptés au fond clair). Les valeurs numériques exactes vivent dans le fichier CSS ; ci-dessous l’intention.

### 4.1 Thème sombre (`.dark`)

| Token | Idée |
|-------|------|
| `--background` | Violet nuit global |
| `--foreground` | Texte clair légèrement chaud |
| `--card` / `--popover` | Surfaces plus claires, toujours dans les violets |
| `--primary` | Vermillon (~27°) — CTA, focus |
| `--primary-foreground` | Texte sur primaire |
| `--secondary` / `--muted` | Plans violets ~288–289° |
| `--muted-foreground` | Secondaire gris-violet ~285° |
| `--accent` | Or ~78° — reflets, bordures « métal » |
| `--accent-foreground` | Texte sur zones accent (foncé) |
| `--border` | `oklch(0.72 0.1 78 / 0.22)` — or translucide |
| `--input` | Champs lisibles sur fond sombre |
| `--ring` | Cohérent avec le vermillon |
| `--chart-*` | Vermillon, or, déclinaisons violettes |
| `--sidebar-*` | Même famille violette + or |

### 4.2 Thème clair (`:root`)

Même logique **kawaii metal** inversée en luminosité : pas de gris neutre « admin », le fond reste **teinté lilas** ; le texte reste **violet profond** ; **vermillon** et **or** gardent les rôles CTA et cadre.

| Token | Idée |
|-------|------|
| `--background` | Lilas-crème (L ~0,95, chroma modéré ~295°) — un ton sous le blanc pur |
| `--foreground` | Violet-encre pour lisibilité |
| `--card` / `--popover` | Quasi-blanc légèrement tiédi — **toujours plus clair** que `--background` |
| `--primary` | Vermillon saturé (lisible sur fond clair) |
| `--primary-foreground` | Blanc cassé sur CTA |
| `--secondary` / `--muted` | Plans violets très lavés |
| `--muted-foreground` | Gris-violet moyen |
| `--accent` | Or « champagne » pour survols / reflets |
| `--accent-foreground` | Texte foncé sur zones accent |
| `--border` | Or translucide un peu plus présent qu’en dark pour détacher les blocs |
| `--input` | Champ clair, bordure cohérente |
| `--ring` | Vermillon (focus) |
| `--chart-*` / `--sidebar-*` | Même famille que le dark, recalée pour fond clair |

### 4.3 Élévation — variables `--shadow-*`

En **clair** comme en **sombre**, les ombres portées sont centralisées pour rester cohérentes (cartes, barre, pied, listes déroulantes, panneaux jeu) :

| Variable | Usage typique |
|----------|----------------|
| `--shadow-card` | `Card` shadcn |
| `--shadow-panel` | blocs média (extrait audio, reveal vidéo) |
| `--shadow-nav` | en-tête sticky |
| `--shadow-footer` | pied de page |
| `--shadow-popover` | contenu `Select`, menus |

En **clair** : filet **or** + diffuse **violette** + halo **vermillon** très léger sur les cartes ; ombres plus courtes et moins noires qu’en dark. En **sombre** : conserver la profondeur type scène (ombres plus longues, glow vermillon plus lisible). Implémentation : `shadow-[var(--shadow-card)]`, etc.

---

## 5. Fond plein écran — valeurs oklch

Calques **`fixed`**, **`pointer-events-none`**, **`aria-hidden`**, `z-index` **négatifs** ; racine avec **`isolate`**. Une couche **`bg-background`** (`-z-40`) assure le replis thème ; les calques décoratifs s’affichent selon **`dark:`** ou **`dark:hidden`**.

### 5.1 Mode sombre (`dark:`)

#### Couche 1 (`z-[-30]`) — dégradé de base

`linear-gradient(168deg, …)` :

- `oklch(0.09 0.08 292)` → `oklch(0.11 0.09 288)` (~42 %) → `oklch(0.06 0.055 305)`

#### Couche 2 (`z-[-20]`) — halos

Trois `radial-gradient` :

1. Haut droite : `oklch(0.48 0.14 303 / 0.38)`
2. Bas gauche (chaleur scène) : `oklch(0.52 0.18 25 / 0.16)`
3. Bas centre : `oklch(0.38 0.14 285 / 0.5)`

#### Couche 3 (`z-[-10]`) — texture (optionnelle)

Motif **SVG en data URI** répété, remplissage type `oklch(0.95 0.03 300 / 0.045)`, conteneur ~`opacity-45` + **`mix-blend-soft-light`**. À retirer ou simplifier si tu veux un fond plus plat.

#### Couche 4 (`z-[-10]`) — vignette

`linear-gradient(transparent 55%, oklch(0.05 0.07 298 / 0.88))`

### 5.2 Mode clair (`dark:hidden`)

Calques **séparés** (même contraintes accessibilité), tons **pastel** pour rappeler la scène sans assombrir l’UI :

1. **Dégradé diagonal** (~168°) : lilas haut → crème milieu → bas plus violet (L plus bas que le blanc).
2. **Halos radiaux** : magenta doux haut-droite, chaleur bas-gauche, violet bas-centre (opacités modérées).
3. **Texture** : petits points / grain violet très dilué, **sans** `mix-blend-soft-light` agressif (opacité modérée sur le calque).
4. **Vignette bas** : léger voile violet-gris pour ancrer le bas d’écran.

Ajuster ces stops en parallèle de **`--background`** dans **`:root`** si tu assombris ou éclaircis le thème clair.

---

## 6. Cartes et composants shadcn — patterns utiles

### Card

- `bg-card/85`, `backdrop-blur-md`, `border-border`, `overflow-hidden`
- Ombre : **`shadow-[var(--shadow-card)]`** (définitions §4.3), ou équivalent manuel type  
  `0 0 0 1px oklch(0.72 0.1 78 / 0.12)`,  
  `0 24px 80px -24px oklch(0.12 0.1 295 / 0.92)`,  
  `0 0 60px -12px oklch(0.58 0.2 27 / 0.2)` en dark si besoin hors variables.
- Overlay diagonal optionnel : `bg-linear-to-br from-primary/8 via-transparent to-accent/10` en couche absolue `pointer-events-none` ; contenu des sections en `relative z-10`

### Badge / Button / Input / Separator

- Badge fort : `border-primary/40`, `bg-primary/15`, petit **box-shadow** oklch vermillon ; variantes outline / secondary selon besoin
- Bouton primaire : halo `shadow-[0_0_28px_oklch(0.58_0.2_27/0.35)]` ; outline avec `border-accent/40`
- Input : `bg-background/60`, `border-input`
- Separator : `bg-border/80`

Icônes **Lucide** au besoin (`Sparkles`, `Flame`, etc.).

---

## 7. Effets lumineux (récap)

| Effet | Technique typique |
|--------|-------------------|
| Glow CTA / badge | `box-shadow` en oklch sur la même teinte que `--primary` |
| Glow titre | `text-shadow` oklch vermillon sur les gros titres si souhaité |
| Profondeur fond | Couches 1–2 (linéaire + radiaux) |
| Texture | `mix-blend-soft-light` + opacité modérée (surtout **dark**) ; clair : texture plus discrète |
| Verre | `backdrop-blur` + fond carte semi-opaque |

---

## 8. Accessibilité & évolution

- Décor de fond : **`aria-hidden`**, ne pas capter les clics.
- Pages FR : **`lang="fr"`** sur `<html>` (ou équivalent).
- Pour **pousser le violet** ou le contraste scène : modifier surtout les **oklch** du **§5** et les blocs **`.dark` / `:root`** du **§4** ; les classes utilitaires `bg-primary`, `border-border`, etc. suivront.
- **Thème clair** : faire évoluer **`:root`**, **`--shadow-*`** (clair) et les calques **§5.2** ensemble pour éviter cartes « flottantes » ou fond trop plat.

**Nouveau composant shadcn** : `npx shadcn@latest add <nom>` puis réutiliser les mêmes tokens.

---

## 9. Fichiers

| Fichier | Rôle |
|---------|------|
| `src/index.css` | Imports, `@theme`, **`:root`**, **`.dark`**, **`--shadow-*`**, `@layer base` |
| Composant racine / `AppShell` | Dégradés **clair & sombre**, option texture, layout, surcharges UI |
| `index.html` | `dark`, `lang`, titre |
| `components.json` | Preset shadcn, `cssVariables` |