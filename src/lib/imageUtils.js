/**
 * Comprime una imagen manteniendo la relación de aspecto.
 * Usa canvas API — funciona en todos los navegadores modernos.
 *
 * @param {File} file           - Archivo de imagen original
 * @param {object} options
 * @param {number} options.maxWidth   - Ancho máximo en px (default 1200)
 * @param {number} options.maxHeight  - Alto máximo en px (default 1200)
 * @param {number} options.quality    - Calidad JPEG 0-1 (default 0.82)
 * @returns {Promise<File>} Archivo comprimido como JPEG
 */
export async function compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = {}) {
  const bitmap = await createImageBitmap(file)

  const { width: origW, height: origH } = bitmap

  // Calcular dimensiones respetando aspect ratio
  let targetW = origW
  let targetH = origH

  if (origW > maxWidth || origH > maxHeight) {
    const ratio = Math.min(maxWidth / origW, maxHeight / origH)
    targetW = Math.round(origW * ratio)
    targetH = Math.round(origH * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH

  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('No se pudo comprimir la imagen')); return }
        // Mantener nombre original pero con extensión .jpg
        const baseName = file.name.replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      quality,
    )
  })
}
