import { logger } from '../utils/logger'

/**
 * Compression d'images côté navigateur avant envoi (soumission de REX, FEAT-033+).
 *
 * Les photos de smartphone (5-10 Mo, souvent HEIC sur iOS) sont redimensionnées et
 * recompressées en JPEG via un <canvas>, ce qui :
 *  - borne le poids du payload base64 transporté dans le POST JSON (le service PHP
 *    applique de son côté une limite « ceinture ») ;
 *  - convertit le HEIC en JPEG affichable (le décodage HEIC est fait par le navigateur
 *    qui a produit le fichier, typiquement Safari iOS).
 *
 * Sortie prête à sérialiser dans le formulaire : { name, dataUrl } où dataUrl est une
 * data URL base64 `data:image/jpeg;base64,…`. Aucune dépendance à Vue (utilitaire pur).
 */

/** Bornes par défaut (cohérentes avec la charte du service : ~2000 px, JPEG q~0.8). */
const DEFAULT_MAX_DIM = 2000
const DEFAULT_QUALITY = 0.8

// Gardes anti-« image bomb » : un fichier énorme, ou une image dont les dimensions
// décodées sont démesurées (ex. 25000×25000 px), sature la mémoire de l'onglet (mobile
// surtout) avant même la compression. On rejette en amont plutôt que de risquer un crash.
const MAX_FILE_BYTES = 40 * 1024 * 1024 // 40 Mo : un fichier photo dépasse rarement ça
const MAX_SOURCE_PIXELS = 60 * 1_000_000 // 60 Mpx : au-delà, on refuse de rasteriser

/**
 * Décode un fichier image en ImageBitmap (gère HEIC/JPEG/PNG/WebP selon le navigateur).
 * Repli sur un <img> + object URL si createImageBitmap est indisponible.
 */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file)
  }
  // Repli (navigateurs anciens) : <img> via object URL.
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/** Dimensions cibles en préservant le ratio, bornées à maxDim sur le plus grand côté. */
function fitDimensions(width, height, maxDim) {
  if (width <= maxDim && height <= maxDim) {
    return { width, height }
  }
  const ratio = width >= height ? maxDim / width : maxDim / height
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

/** Convertit un Blob en data URL base64. */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Compresse un fichier image en JPEG redimensionné.
 *
 * @param {File} file  fichier sélectionné (image/*)
 * @param {{maxDim?:number, quality?:number}} [opts]
 * @returns {Promise<{name:string, dataUrl:string}>}
 * @throws si le fichier n'est pas décodable en image
 */
export async function compressImage(file, opts = {}) {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM
  const quality = opts.quality ?? DEFAULT_QUALITY

  // Garde 1 : poids du fichier (avant tout décodage — pas d'allocation lourde).
  if (typeof file?.size === 'number' && file.size > MAX_FILE_BYTES) {
    throw new Error(`Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)} Mo)`)
  }

  const bitmap = await decodeImage(file)
  const srcW = bitmap.width
  const srcH = bitmap.height
  // Garde 2 : résolution source démesurée (image bomb). On ferme le bitmap déjà décodé
  // avant de renoncer, pour libérer la mémoire au plus tôt.
  if (srcW * srcH > MAX_SOURCE_PIXELS) {
    if (typeof bitmap.close === 'function') bitmap.close()
    throw new Error(`Image trop grande (${srcW}×${srcH} px)`)
  }
  const { width, height } = fitDimensions(srcW, srcH, maxDim)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // Fond blanc : le JPEG n'a pas de canal alpha ; sans ce remplissage, les zones
  // transparentes d'un PNG/WebP seraient rendues en noir. On aplatit sur du blanc.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  // Libère la mémoire du bitmap dès que possible (photos volumineuses).
  if (typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob a renvoyé null'))),
      'image/jpeg',
      quality,
    )
  })

  const dataUrl = await blobToDataUrl(blob)
  // Nom d'origine avec extension normalisée en .jpg (le contenu est désormais JPEG).
  const baseName = (file.name || 'photo').replace(/\.[^./\\]+$/, '')
  return { name: `${baseName}.jpg`, dataUrl }
}

/**
 * Compresse plusieurs fichiers. Best-effort : un fichier illisible est ignoré (log)
 * plutôt que de faire échouer tout le lot. Renvoie la liste des résultats valides.
 *
 * @param {File[]|FileList} files
 * @param {{maxDim?:number, quality?:number}} [opts]
 * @returns {Promise<Array<{name:string, dataUrl:string}>>}
 */
export async function compressImages(files, opts = {}) {
  const list = Array.from(files ?? [])
  const out = []
  for (const file of list) {
    try {
      out.push(await compressImage(file, opts))
    } catch (e) {
      logger.warn('Image ignorée (décodage/compression impossible) :', file?.name, e)
    }
  }
  return out
}

export function useImageCompressor() {
  return { compressImage, compressImages, DEFAULT_MAX_DIM, DEFAULT_QUALITY }
}
