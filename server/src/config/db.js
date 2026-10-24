import mongoose from 'mongoose'
import { env } from './env.js'
import { Workspace } from '../models/Workspace.js'

let transactionsSupported = false
let connectionPromise

export const supportsTransactions = () => transactionsSupported

async function connectAndInitialize() {
  await mongoose.connect(env.mongodbUri)

  const collections = await mongoose.connection.db
    .listCollections({ name: Workspace.collection.name }, { nameOnly: true })
    .toArray()
  if (collections.length > 0) {
    const indexes = await Workspace.collection.indexes()
    const legacyOwnerIndex = indexes.find((index) => index.unique && index.key.ownerId === 1)
    if (legacyOwnerIndex) await Workspace.collection.dropIndex(legacyOwnerIndex.name)
  }

  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  transactionsSupported = Boolean(hello.setName) || hello.msg === 'isdbgrid'

  console.log(`MongoDB connected (${mongoose.connection.host})`)
  if (!transactionsSupported) {
    console.warn(
      'This MongoDB server does not support transactions (standalone). Compile batches will NOT be atomic. ' +
        'Use MongoDB Atlas or a local replica set for atomic behaviour.'
    )
  }
}

export async function connectDB() {
  if (!connectionPromise) {
    connectionPromise = connectAndInitialize().catch((err) => {
      connectionPromise = undefined
      throw err
    })
  }
  await connectionPromise
}
