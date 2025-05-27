import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { seedDatabase } from '@/utils/seed';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TestSupabase = () => {
  const [connectionStatus, setConnectionStatus] = useState("Testing...");
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [envCheck, setEnvCheck] = useState({
    url: false,
    key: false
  });

  useEffect(() => {
    checkEnvironment();
    testConnection();
  }, []);

  const checkEnvironment = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    setEnvCheck({
      url: !!url,
      key: !!key
    });

    if (!url || !key) {
      setConnectionStatus("❌ Missing environment variables");
      setError("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Secrets");
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus("Testing connection...");
      setError(null);

      // Test basic connection
      const { data, error: queryError } = await supabase
        .from("users")
        .select("*")
        .limit(5);

      if (queryError) {
        setConnectionStatus(`❌ Query Error: ${queryError.message}`);
        setError(queryError.message);

        // Check if it's a table not found error
        if (queryError.code === "PGRST106") {
          setConnectionStatus(
            '❌ Table "users" not found. Please run the database schema.',
          );
        }
      } else {
        setConnectionStatus("✅ Connected successfully!");
        setUsers(data || []);
        console.log("Supabase test successful:", { userCount: data?.length });
      }
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error";
      setConnectionStatus(`❌ Connection failed: ${errorMessage}`);
      setError(errorMessage);
      console.error("Supabase connection test failed:", err);
    }
  };

  const testSchema = async () => {
    try {
      setConnectionStatus("Testing database schema...");

      // Test all required tables
      const tables = [
        "users",
        "transactions", 
        "tree_upgrades",
        "topup_requests",
        "withdrawal_requests",
      ];
      const results = [];

      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select("*").limit(1);
          results.push({ table, exists: !error });
        } catch (err) {
          results.push({ table, exists: false });
        }
      }

      const allTablesExist = results.every((r) => r.exists);

      if (allTablesExist) {
        setConnectionStatus("✅ All database tables found!");
      } else {
        const missingTables = results
          .filter((r) => !r.exists)
          .map((r) => r.table);
        setConnectionStatus(`❌ Missing tables: ${missingTables.join(", ")}`);
      }

      console.log("Schema test results:", results);
    } catch (err) {
      setConnectionStatus(`❌ Schema test failed: ${err}`);
    }
  };

  const testAdminFunctions = async () => {
    try {
      setConnectionStatus("Testing admin functions...");

      // Test creating a user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([{
          username: 'test_user_' + Date.now(),
          password_hash: 'test_password',
          coins: 100,
          chips: 50,
          is_admin: false
        }])
        .select()
        .single();

      if (createError) {
        setConnectionStatus(`❌ Create user failed: ${createError.message}`);
        return;
      }

      // Test updating user
      const { error: updateError } = await supabase
        .from("users")
        .update({ coins: 200 })
        .eq('id', newUser.id);

      if (updateError) {
        setConnectionStatus(`❌ Update user failed: ${updateError.message}`);
        return;
      }

      // Test deleting user
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq('id', newUser.id);

      if (deleteError) {
        setConnectionStatus(`❌ Delete user failed: ${deleteError.message}`);
        return;
      }

      setConnectionStatus("✅ Admin functions working!");
    } catch (err: any) {
      setConnectionStatus(`❌ Admin test failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Supabase Connection & Admin Function Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded">
              <p className="text-lg font-semibold">{connectionStatus}</p>
              {error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                  <p className="text-red-700 text-sm">Error Details: {error}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button onClick={testConnection}>Test Connection</Button>
              <Button onClick={testSchema} variant="outline">
                Test Schema
              </Button>
              <Button onClick={seedDatabase} variant="outline">
                Seed Database
              </Button>
              <Button onClick={testAdminFunctions} variant="secondary">
                Test Admin Functions
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Environment Check:</h3>
                <ul className="text-sm space-y-1">
                  <li>
                    Supabase URL:{" "}
                    {envCheck.url ? "✅ Set" : "❌ Missing"}
                  </li>
                  <li>
                    Supabase Key:{" "}
                    {envCheck.key ? "✅ Set" : "❌ Missing"}
                  </li>
                </ul>
                {(!envCheck.url || !envCheck.key) && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-700 text-sm">
                      Add these to your Secrets in Replit:
                    </p>
                    <ul className="text-xs mt-1 text-red-600">
                      <li>VITE_SUPABASE_URL=your_supabase_url</li>
                      <li>VITE_SUPABASE_ANON_KEY=your_anon_key</li>
                    </ul>
                  </div>
                )}
              </div>

              {users.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Sample Users:</h3>
                  <ul className="space-y-1 text-sm">
                    {users.map((user, index) => (
                      <li key={index}>
                        {user.username} - Coins: {user.coins}, Chips:{" "}
                        {user.chips}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestSupabase;