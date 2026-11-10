import { CTA, PageHeader, RankLadder } from "@/components/ui";

export const metadata = { title: "How It Works" };

export default function HowItWorks() {
  return (
    <div className="container-eb py-12">
      <PageHeader eyebrow="The Guild handbook" title="How Everbound works">
        A persistent tabletop adventure you can join on your schedule. Your progress belongs to you, and the world keeps moving whether you are at the table or not.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section n="1" title="Obtain your guild card">
          Every adventurer receives a physical guild card with a unique member number and QR code. Scan it with your phone, create an account, and the card is bound to you —
          once, and only to you. Lost it? A Guild Master can retire it and issue a replacement without touching your progress. Scanning a card never signs anyone in; it
          shows a verified public profile.
        </Section>
        <Section n="2" title="Register your adventurer">
          Choose a species, a class and a handful of attribute points. That is it — the Guild Master teaches the rest at the table. New to tabletop roleplaying? You are
          exactly who we built this for.
        </Section>
        <Section n="3" title="Accept quests">
          The Quest Board lists hosted adventures at our partner game store. Reserve a seat, join a waitlist if the table is full, and see every upcoming booking on your
          dashboard. Each quest is about three hours.
        </Section>
        <Section n="4" title="Play, earn, return">
          After the session, your Guild Master records what happened. XP, gold, loot and renown are added to your permanent record, and you can reread the adventure in
          your journal.
        </Section>
        <Section n="5" title="Come and go freely">
          You don&apos;t have to attend every week. Miss three weeks and there will still be quests for you. Other parties keep the world moving in the meantime — and
          your past choices still matter.
        </Section>
        <Section n="6" title="Change the world">
          Quest outcomes update the shared world: roads reopen, villages fall, merchants restock, and sealed raids awaken. The Everbound Chronicle reports it all.
        </Section>
      </div>

      <div className="divider-ornament" aria-hidden>✦</div>

      <div className="grid gap-6">
        <div className="panel sm:p-8">
          <h2 className="heading text-2xl">Guild ranks</h2>
          <p className="muted mt-1 text-sm">Rank reflects service to the Guild and is separate from character level. Higher ranks unlock elite quests and upgraded physical cards.</p>
          <div className="mt-6"><RankLadder /></div>
        </div>
        <div className="panel">
          <h2 className="heading text-2xl">Three kinds of progress</h2>
          <table className="table-eb mt-4">
            <thead><tr><th>Resource</th><th>Earned through</th><th>Used for</th></tr></thead>
            <tbody>
              <tr><td className="font-semibold text-gold-light">Gold</td><td>Quests, treasure</td><td>In-world gear at the Arcane Exchange</td></tr>
              <tr><td className="font-semibold text-gold-light">Renown</td><td>Guild achievements</td><td>Rank and recognition</td></tr>
              <tr><td className="font-semibold text-gold-light">XP</td><td>Adventuring</td><td>Character level</td></tr>
            </tbody>
          </table>
          <p className="muted mt-4 text-sm">Gold can never be bought with real money. Store purchases are physical or cosmetic and never give a gameplay advantage.</p>
        </div>
      </div>

      <div className="mt-10 text-center">
        <CTA href="/join/">Join the Guild</CTA>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="reveal panel">
      <p className="eyebrow">Step {n}</p>
      <h2 className="heading mt-1 text-xl">{title}</h2>
      <p className="muted mt-2 text-sm leading-relaxed">{children}</p>
    </section>
  );
}
