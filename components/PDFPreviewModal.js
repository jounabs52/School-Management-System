'use client'

import { useState, useEffect } from 'react'
import { X, Download, Loader2 } from 'lucide-react'

/**
 * PDF Preview Modal Component
 *
 * A reusable modal for previewing PDF documents before download
 *
 * @param {Object} props
 * @param {string|null} props.pdfUrl - The blob URL or data URL of the PDF to preview
 * @param {string} props.fileName - The filename for the download
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Callback when modal is closed
 */
export default function PDFPreviewModal({ pdfUrl, fileName = 'document.pdf', isOpen, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && pdfUrl) {
      setLoading(true)
      setError(null)

      // Small delay to ensure PDF is ready
      const timer = setTimeout(() => {
        setLoading(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isOpen, pdfUrl])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  const handleDownload = () => {
    if (!pdfUrl) return

    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClose = () => {
    // Revoke the blob URL to free memory
    if (pdfUrl && pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrl)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[99998]"
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={handleClose}
      />

      {/* Modal - Full Screen */}
      <div className="fixed inset-0 z-[99999]">
        <div
          className="bg-white w-full h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">PDF Preview</h3>
              <p className="text-blue-200 text-xs mt-0.5">{fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={!pdfUrl || loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title="Download PDF"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/10 p-2 rounded-lg transition"
                title="Close Preview"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* PDF Preview Area */}
          <div className="flex-1 relative bg-gray-100 overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Loading PDF preview...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center text-red-600">
                  <p className="font-semibold mb-2">Failed to load PDF preview</p>
                  <p className="text-sm text-gray-600">{error}</p>
                  <button
                    onClick={handleDownload}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Download PDF Instead
                  </button>
                </div>
              </div>
            )}

            {pdfUrl && !error && (
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title="PDF Preview"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false)
                  setError('Unable to display PDF in browser. Please download to view.')
                }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Preview your PDF before downloading. Use the toolbar above to download or close.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
