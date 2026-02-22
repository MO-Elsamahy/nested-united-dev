import { createClient } from "@/lib/supabase/server";

export default async function DebugPage() {
  const supabase = await createClient();
  
  // Get auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  // Try to get user from users table
  const { data: dbUser, error: dbError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser?.id || "")
    .single();
  
  return (
    <div className="p-8 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold">Debug Info</h1>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Auth User:</h2>
        <pre className="text-sm">{JSON.stringify(authUser, null, 2)}</pre>
        {authError && <p className="text-red-600">Error: {authError.message}</p>}
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">DB User:</h2>
        <pre className="text-sm">{JSON.stringify(dbUser, null, 2)}</pre>
        {dbError && <p className="text-red-600">Error: {dbError.message}</p>}
      </div>
    </div>
  );
}







