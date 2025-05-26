
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { runMigrations, migrateLocalStorageToSupabase } from '@/utils/migrate';

const MigrationPage = () => {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setMigrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleMigration = async () => {
    setMigrationStatus('running');
    setMigrationLog([]);
    
    try {
      addLog('Starting migration process...');
      
      // Check if schema is set up
      addLog('Checking database schema...');
      const schemaReady = await runMigrations();
      
      if (!schemaReady) {
        addLog('❌ Database schema not found. Please run the SQL schema in your Supabase dashboard first.');
        setMigrationStatus('error');
        return;
      }
      
      addLog('✅ Database schema verified');
      
      // Migrate localStorage data
      addLog('Migrating localStorage data to Supabase...');
      await migrateLocalStorageToSupabase();
      addLog('✅ Data migration completed');
      
      setMigrationStatus('success');
      addLog('🎉 Migration completed successfully!');
      
    } catch (error) {
      console.error('Migration error:', error);
      addLog(`❌ Migration failed: ${error}`);
      setMigrationStatus('error');
    }
  };

  const checkLocalStorageData = () => {
    const currentUser = localStorage.getItem('casinoUser');
    const users = localStorage.getItem('casinoUsers');
    const pendingTopUps = localStorage.getItem('pendingTopUps');
    
    addLog('=== LocalStorage Data Check ===');
    addLog(`Current User: ${currentUser ? 'Found' : 'Not found'}`);
    addLog(`Users Database: ${users ? 'Found' : 'Not found'}`);
    addLog(`Pending Top-ups: ${pendingTopUps ? 'Found' : 'Not found'}`);
    
    if (currentUser) {
      const user = JSON.parse(currentUser);
      addLog(`Current User Details: ${user.username} (${user.isAdmin ? 'Admin' : 'User'})`);
      addLog(`Coins: ${user.coins || 0}, Chips: ${user.chips || 0}`);
    }
    
    if (users) {
      const usersObj = JSON.parse(users);
      const userCount = Object.keys(usersObj).length;
      addLog(`Total Users: ${userCount}`);
      Object.keys(usersObj).forEach(username => {
        const userData = usersObj[username];
        addLog(`  - ${username}: ${userData.coins || 0} coins, ${userData.chips || 0} chips`);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🔄</span>
              <span>Database Migration Tool</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                This tool will migrate your localStorage data to Supabase. Make sure you have:
                <ul className="mt-2 ml-4 list-disc">
                  <li>Set up your Supabase project</li>
                  <li>Added environment variables to .env.local</li>
                  <li>Run the database schema in Supabase SQL editor</li>
                  <li>Created the 'receipts' storage bucket</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex space-x-4">
              <Button onClick={checkLocalStorageData} variant="outline">
                Check LocalStorage Data
              </Button>
              
              <Button
                onClick={handleMigration}
                disabled={migrationStatus === 'running'}
                className={
                  migrationStatus === 'success' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : migrationStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : ''
                }
              >
                {migrationStatus === 'running' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {migrationStatus === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
                {migrationStatus === 'error' && <XCircle className="w-4 h-4 mr-2" />}
                {migrationStatus === 'idle' && 'Start Migration'}
                {migrationStatus === 'running' && 'Migrating...'}
                {migrationStatus === 'success' && 'Migration Complete'}
                {migrationStatus === 'error' && 'Migration Failed'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {migrationLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Migration Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {migrationLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MigrationPage;
