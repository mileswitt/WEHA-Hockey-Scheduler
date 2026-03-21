import { useRef, useState } from 'react'

export default function FileUpload({ onTeamsGenerated }) {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState(null)
  const [file, setFile] = useState(null)
  const [division, setDivision] = useState('')
  const [algorithm, setAlgorithm] = useState('')
  const [numTeams, setNumTeams] = useState(4)
  const [errors, setErrors] = useState({})
  const [previewData, setPreviewData] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  const validExtensions = ['.csv']
  const validTypes = ['text/csv', 'text/plain', 'application/csv']

  const validateAndSetFile = (selected) => {
    if (!selected) return
    const ext = '.' + selected.name.split('.').pop().toLowerCase()
    if (!validTypes.includes(selected.type) && !validExtensions.includes(ext)) {
      setErrors(prev => ({ ...prev, file: 'Invalid file type. Please upload a CSV file.' }))
      setFileName(null)
      setFile(null)
      setPreviewData(null)
      return false
    }
    setErrors(prev => ({ ...prev, file: null }))
    setFileName(selected.name)
    setFile(selected)
    setPreviewData(null)
    setShowConfirm(false)
    setUploadSuccess(false)
    return true
  }

  const handleFileChange = (e) => validateAndSetFile(e.target.files[0])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setDragging(false) }
  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    validateAndSetFile(e.dataTransfer.files[0])
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()))
    return { headers, rows }
  }

  const handleSubmit = async () => {
    const newErrors = {}
    if (!division) newErrors.division = 'Please select a division.'
    if (!algorithm) newErrors.algorithm = 'Please select an algorithm.'
    if (!file) newErrors.file = 'Please upload a file.'
    if (algorithm === 'Team Fairness' && (!numTeams || numTeams < 2)) {
      newErrors.numTeams = 'Please enter at least 2 teams.'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    const text = await file.text()
    setPreviewData(parseCSV(text))
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    setApiError(null)

    if (algorithm === 'Team Fairness') {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('num_teams', numTeams)

        const res = await fetch('http://localhost:10000/generate-teams', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          setApiError(data.error || 'Something went wrong.')
          setLoading(false)
          return
        }

        if (onTeamsGenerated) {
          onTeamsGenerated(data.teams, division)
        }

        setShowConfirm(false)
        setUploadSuccess(true)
        setFileName(null)
        setFile(null)
        setPreviewData(null)
        setDivision('')
        setAlgorithm('')
        setNumTeams(4)
        fileInputRef.current.value = ''
      } catch (err) {
        setApiError('Could not connect to the server. Is your Flask backend running?')
      }
    } else {
      setShowConfirm(false)
      setUploadSuccess(true)
    }

    setLoading(false)
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setPreviewData(null)
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="bg-gray-800 p-6 rounded-lg">

        {uploadSuccess && (
          <div className="mb-4 p-3 bg-green-700 text-white rounded">
            ✅ Teams generated successfully! Check the Dashboard.
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-start gap-4 flex-wrap mb-6">

          <div className="flex flex-col gap-1">
            <select
              value={division}
              onChange={e => { setDivision(e.target.value); setErrors(prev => ({ ...prev, division: null })) }}
              className={`p-2 rounded bg-gray-700 border text-white ${errors.division ? 'border-red-500' : 'border-gray-600'}`}
            >
              <option value="" disabled>Division</option>
              <option>U10</option>
              <option>U12</option>
              <option>U14</option>
              <option>U16</option>
            </select>
            {errors.division && <span className="text-red-400 text-xs">{errors.division}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <select
              value={algorithm}
              onChange={e => { setAlgorithm(e.target.value); setErrors(prev => ({ ...prev, algorithm: null })) }}
              className={`p-2 rounded bg-gray-700 border text-white ${errors.algorithm ? 'border-red-500' : 'border-gray-600'}`}
            >
              <option value="" disabled>Algorithm</option>
              <option>Team Fairness</option>
              <option>Game Scheduling</option>
            </select>
            {errors.algorithm && <span className="text-red-400 text-xs">{errors.algorithm}</span>}
          </div>

          {algorithm === 'Team Fairness' && (
            <div className="flex flex-col gap-1">
              <input
                type="number"
                min={2}
                max={20}
                value={numTeams}
                onChange={e => { setNumTeams(parseInt(e.target.value)); setErrors(prev => ({ ...prev, numTeams: null })) }}
                className={`p-2 rounded bg-gray-700 border text-white w-24 ${errors.numTeams ? 'border-red-500' : 'border-gray-600'}`}
                placeholder="# Teams"
              />
              {errors.numTeams && <span className="text-red-400 text-xs">{errors.numTeams}</span>}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="bg-red-600 hover:bg-red-700 active:scale-95 transition transform px-4 py-2 rounded font-medium whitespace-nowrap cursor-pointer"
              >
                Choose File
              </button>
              <span className="text-sm text-gray-300 whitespace-nowrap">
                {fileName || 'No file chosen'}
              </span>
            </div>
            {errors.file && <span className="text-red-400 text-xs">{errors.file}</span>}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition transform px-4 py-2 rounded font-medium whitespace-nowrap"
          >
            Submit
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-red-500 bg-red-500/10'
            : file ? 'border-green-500 bg-green-500/10'
            : 'border-gray-600 hover:border-gray-400 hover:bg-gray-700/50'
          }`}
        >
          {dragging ? (
            <p className="text-red-400 font-medium">Drop it here!</p>
          ) : file ? (
            <div>
              <p className="text-green-400 font-medium">✅ {fileName}</p>
              <p className="text-gray.400 text-sm mt-1">Click or drag to replace</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-300 font-medium">Drag & drop your file here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse — CSV files only</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '0', height: '0', opacity: '0', pointerEvents: 'none' }}
        />
      </div>

      {/* Preview + Confirm */}
      {showConfirm && (
        <div className="mt-6 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Preview Data</h2>

          <div className="mb-4 text-sm text-gray-300">
            <span className="mr-4">Division: <strong className="text-white">{division}</strong></span>
            <span className="mr-4">Algorithm: <strong className="text-white">{algorithm}</strong></span>
            {algorithm === 'Team Fairness' && (
              <span>Teams: <strong className="text-white">{numTeams}</strong></span>
            )}
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-red-700 text-white rounded">{apiError}</div>
          )}

          {previewData && (
            <div className="overflow-x-auto mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-700 sticky top-0">
                    {previewData.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 border border-gray-600 text-white">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 border border-gray-600 text-gray-300">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-medium transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Confirm Upload'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}