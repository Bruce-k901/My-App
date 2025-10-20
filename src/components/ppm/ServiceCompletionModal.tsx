import { useState } from "react"
import { logServiceEvent, updatePPMSchedule } from "@/lib/ppm"

export default function ServiceCompletionModal({ ppm, asset, user, onClose }: {
  ppm: any;
  asset: any;
  user: any;
  onClose: (refreshData: boolean) => void;
}) {
  const [form, setForm] = useState({
    service_date: new Date().toISOString().split("T")[0],
    contractor_id: asset.contractor_id || "",
    notes: "",
    file_url: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    try {
      setSaving(true)
      setError("")

      // Log service
      await logServiceEvent({
        ppm_id: ppm.id,
        asset_id: asset.id,
        contractor_id: form.contractor_id,
        service_date: form.service_date,
        notes: form.notes,
        file_url: form.file_url,
        user_id: user.id
      })

      // Update ppm schedule
      await updatePPMSchedule(ppm.id, form.service_date)

      onClose(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 bg-neutral-900 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold mb-4">Complete Service</h3>

      <label className="block mb-3">
        <span className="text-sm text-gray-300">Service Date</span>
        <input
          type="date"
          value={form.service_date}
          onChange={e => setForm({ ...form, service_date: e.target.value })}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 mt-1"
        />
      </label>

      <label className="block mb-3">
        <span className="text-sm text-gray-300">Notes</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 mt-1"
        />
      </label>

      <div className="flex justify-end space-x-3 mt-4">
        <button
          className="bg-gray-700 px-4 py-2 rounded-md"
          onClick={() => onClose(false)}
        >
          Cancel
        </button>
        <button
          disabled={saving}
          className="bg-green-600 px-4 py-2 rounded-md hover:bg-green-700"
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Service"}
        </button>
      </div>

      {error && <p className="text-red-500 mt-3">{error}</p>}
    </div>
  )
}