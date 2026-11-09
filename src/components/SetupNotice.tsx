export function SetupNotice() {
  return (
    <div className="panel-arcane mx-auto my-10 max-w-2xl">
      <p className="eyebrow">Setup required</p>
      <h2 className="heading mt-2 text-2xl">The Guild Hall is not connected yet</h2>
      <p className="muted mt-3 text-sm">
        This deployment has no Supabase project configured. Set <code className="text-arcane-light">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-arcane-light">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run the database setup SQL, then redeploy. See{" "}
        <code className="text-arcane-light">docs/SETUP.md</code> in the repository.
      </p>
    </div>
  );
}
