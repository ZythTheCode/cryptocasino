
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestSupabase = () => {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').limit(5);
      
      if (error) {
        setConnectionStatus(`Error: ${error.message}`);
      } else {
        setConnectionStatus('✅ Connected successfully!');
        setUsers(data || []);
      }
    } catch (err) {
      setConnectionStatus(`Connection failed: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Supabase Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-lg">{connectionStatus}</p>
            
            <Button onClick={testConnection}>
              Test Connection Again
            </Button>
            
            {users.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Users in Database:</h3>
                <ul className="space-y-1">
                  {users.map((user, index) => (
                    <li key={index} className="text-sm">
                      {user.username} - Coins: {user.coins}, Chips: {user.chips}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestSupabase;
