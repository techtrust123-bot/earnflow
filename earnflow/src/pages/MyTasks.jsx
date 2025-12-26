import { useEffect, useState } from 'react'
import axios from '../utils/axios'
import Container from '../components/Container'

export default function MyTasks(){
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    const load = async ()=>{
      try{
        const res = await axios.get('/campaigns/mine')
        if (mounted) setTasks(res.data.tasks || [])
      }catch(err){
        console.error(err)
      }finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  },[])

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white via-sky-50 to-indigo-50">
      <Container>
        <div className="max-w-4xl mx-auto w-full sm:mx-0 px-2 sm:px-0">
          <h2 className="text-xl font-bold mb-4">My Tasks</h2>
          {loading ? <div>Loading...</div> : (
            <div className="space-y-4">
              {tasks.length===0 ? <div className="text-gray-600">No tasks created yet.</div> : tasks.map(t=> (
                <div key={t._id} className="bg-white p-4 rounded-xl shadow-sm w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{t.action.toUpperCase()} — {t.link}</div>
                      <div className="text-sm text-gray-600">Amount: {t.currency==='NGN' ? '₦' : '$'}{t.amount} • Slots: {t.slots}</div>
                    </div>
                    <div className="text-sm font-medium">{t.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}
