"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAllReactionCounts = void 0;
const database_1 = require("./database");
const repository_1 = require("../domains/reaction/repository");
const service_1 = require("../domains/reaction/service");
async function syncAllReactionCounts() {
    console.log('Starting reaction count synchronization...');
    const reactionRepository = new repository_1.ReactionRepositoryImpl(database_1.db);
    const reactionService = new service_1.ReactionServiceImpl(reactionRepository);
    try {
        await reactionService.syncAllReactionCounts();
        console.log('Reaction count synchronization completed successfully');
    }
    catch (error) {
        console.error('Error synchronizing reaction counts:', error);
        throw error;
    }
}
exports.syncAllReactionCounts = syncAllReactionCounts;
if (require.main === module) {
    syncAllReactionCounts()
        .then(() => {
        console.log('Sync script execution completed');
        process.exit(0);
    })
        .catch(error => {
        console.error('Sync script execution failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=sync-reaction-counts.js.map