import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { ExpressAdapter } from '@bull-board/express'
import { codeExecutionQueue } from './setup.js'

// Create express adapter for Bull Board
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')

// Create Bull Board with code execution queue
createBullBoard({
    queues: [new BullMQAdapter(codeExecutionQueue)],
    serverAdapter,
})

console.log('📊 BullBoard dashboard configured at /admin/queues')

export default serverAdapter
