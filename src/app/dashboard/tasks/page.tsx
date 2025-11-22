import { redirect } from 'next/navigation'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const queryString = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      queryString.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach(v => queryString.append(key, v))
    }
  })
  
  const query = queryString.toString()
  const destination = `/dashboard/tasks/my-tasks${query ? `?${query}` : ''}`
  
  redirect(destination)
}
