import FileUpload from '../components/FileUpload'

export default function Upload({ onTeamsGenerated }) {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Upload Data</h1>
      <div className="flex justify-center">
        <FileUpload onTeamsGenerated={onTeamsGenerated} />
      </div>
    </div>
  )
}