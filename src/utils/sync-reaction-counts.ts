import { db } from './database'
import { ReactionRepositoryImpl } from '@domains/reaction/repository'
import { ReactionServiceImpl } from '@domains/reaction/service'

/**
 * Utility function to sync reaction counts for all posts.
 * This is useful to ensure that stored reaction counts match actual reaction counts in the database.
 */
export async function syncAllReactionCounts(): Promise<void> {
  console.log('Starting reaction count synchronization...')

  // Create repository and service instances
  const reactionRepository = new ReactionRepositoryImpl(db)
  const reactionService = new ReactionServiceImpl(reactionRepository)

  try {
    // Call the service method to sync all reaction counts
    await reactionService.syncAllReactionCounts()
    console.log('Reaction count synchronization completed successfully')
  } catch (error) {
    console.error('Error synchronizing reaction counts:', error)
    throw error
  }
}

// If this script is run directly (e.g., node -r ts-node/register src/utils/sync-reaction-counts.ts)
if (require.main === module) {
  syncAllReactionCounts()
    .then(() => {
      console.log('Sync script execution completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('Sync script execution failed:', error)
      process.exit(1)
    })
}