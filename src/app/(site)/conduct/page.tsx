import Link from "next/link";
import { PageHeader, SystemWindow } from "@/components/ui";

export const metadata = { title: "Code of Conduct" };

const LAST_UPDATED = "November 2026";

function Article({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`article-${n}`} className="reveal panel scroll-mt-24 sm:p-7">
      <p className="eyebrow">Article {n}</p>
      <h2 className="heading mt-1 text-2xl">{title}</h2>
      <div className="mt-3 grid gap-3 text-[15px] leading-relaxed text-parchment/85 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-gold-light [&_ul]:grid [&_ul]:gap-1.5">{children}</div>
    </section>
  );
}

const LADDER: [string, string, string][] = [
  ["I", "Warning", "A Guild Master talks with you, and a note goes on your record."],
  ["II", "Chat mute", "You can read the Tavern but not post, for an hour up to a week."],
  ["III", "Suspension", "No quests, chat, trading or errands for a set time, usually 1–4 weeks. Lifts automatically."],
  ["IV", "Ban", "Your account is closed and your guild card retired."],
];

export default function ConductPage() {
  return (
    <div className="container-eb max-w-4xl py-12">
      <PageHeader eyebrow={`Guild Charter · Last updated ${LAST_UPDATED}`} title="Code of Conduct">
        Everbound only works if everyone at the table — and in the Tavern — feels welcome and safe. By claiming a guild card, every adventurer agrees to this charter.
      </PageHeader>

      <SystemWindow title="The Short Version" className="mb-8">
        <ul className="grid gap-2 text-[15px] text-parchment/90 sm:grid-cols-2">
          {[
            "Be kind. Play to make the game fun for everyone, not just you.",
            "Respect the safety tools. If someone taps the X-card, move on — no questions asked.",
            "Your character can be a villain; you can't be a jerk.",
            "Keep personal info private, especially other people's.",
            "Play fair: no cheating, no selling items for real money, one account per person.",
            "Respect the store, its staff and its stock.",
          ].map((t) => <li key={t} className="flex gap-2"><span className="text-arcane">◆</span>{t}</li>)}
        </ul>
      </SystemWindow>

      <nav aria-label="Articles" className="mb-8 flex flex-wrap gap-2">
        {["Respect", "At the table", "In the Tavern", "Young adventurers", "Fair play", "The store", "Consequences", "Reporting & appeals"].map((t, i) => (
          <a key={t} href={`#article-${["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][i]}`} className="btn-ghost btn-sm">{t}</a>
        ))}
      </nav>

      <div className="grid gap-5">
        <Article n="I" title="Respect Every Adventurer">
          <p>Everbound is for everyone. We do not tolerate harassment, discrimination or bullying of any kind — including about race, ethnicity, religion, gender, gender identity, sexual orientation, disability, age, body, or experience level.</p>
          <ul>
            <li>Use the names and pronouns people ask you to use.</li>
            <li>No unwanted physical contact, and respect personal space at the table.</li>
            <li>No threats, intimidation, stalking or following someone around the store or online.</li>
            <li>New players are welcome. Help them learn; never mock someone for not knowing the rules.</li>
          </ul>
        </Article>

        <Article n="II" title="At the Table">
          <p>Every session starts with a quick <strong>session zero</strong>: the Guild Master explains the quest&apos;s themes and its content advisories (shown on every quest page), and checks what everyone is comfortable with.</p>
          <ul>
            <li><strong>The X-card.</strong> Anyone can tap the X-card, or simply say “let&apos;s skip this”, to remove something from the scene. No explanation needed, no arguments, no jokes about it.</li>
            <li><strong>Lines and veils.</strong> Some content is never in our games (a line). Some happens “off-screen” (a veil). The Guild Master sets these, and you can ask privately for more.</li>
            <li><strong>Share the spotlight.</strong> Let others act, talk and shine. Don&apos;t talk over people or play their characters for them.</li>
            <li><strong>In-character is not an excuse.</strong> Your character may be grumpy or villainous; targeting a real person through your character is not allowed.</li>
            <li><strong>The Guild Master&apos;s ruling stands</strong> for the session. Disagree politely, and raise it afterwards if it matters.</li>
            <li>Arrive on time and cancel early if you can&apos;t make it, so someone on the waitlist can play.</li>
          </ul>
        </Article>

        <Article n="III" title="In the Guild Tavern (online chat)">
          <ul>
            <li>The same respect rules apply online as in person.</li>
            <li><strong>Never share personal contact details</strong> — yours or anyone else&apos;s — such as phone numbers, addresses, social media or school. The Tavern blocks email addresses and phone numbers automatically.</li>
            <li>No spam, advertising, explicit content, or content unsuitable for a 13-year-old.</li>
            <li>Use <strong>Report</strong> on any message that breaks these rules, and <strong>Block</strong> anyone you don&apos;t want to hear from.</li>
            <li>Keep spoilers for a quest out of the general channels so players who haven&apos;t run it yet can enjoy it.</li>
          </ul>
        </Article>

        <Article n="IV" title="Young Adventurers (ages 13–17)">
          <p>Everbound is for ages 13 and up. Some quests carry a higher age rating (for example 15+) because of their themes, and only adventurers of that age can book them.</p>
          <ul>
            <li>Adventurers under 18 need a parent or guardian&apos;s permission, confirmed when they claim their card.</li>
            <li>Adults must never ask a minor for personal contact details, invite them to private chats or meet-ups outside Guild events, or send them private messages on other platforms.</li>
            <li>Content at a table with players under 18 stays appropriate for the youngest player present.</li>
            <li>If an adventurer under 18 is suspended, we will contact their parent or guardian.</li>
            <li>Anything that puts a young adventurer&apos;s safety at risk skips straight to suspension or a ban, and may be reported to the appropriate authorities.</li>
          </ul>
        </Article>

        <Article n="V" title="Fair Play">
          <ul>
            <li><strong>One account and one guild card per person.</strong> Don&apos;t share, sell or lend your card or your login.</li>
            <li><strong>No real-money trading.</strong> Gold, items and characters may never be bought or sold for real money, inside or outside the site. Trade only through the Auction Hall.</li>
            <li>Don&apos;t exploit bugs. If you find one, tell a Guild Master — honesty may even earn you a reward.</li>
            <li>Don&apos;t pressure other players, especially newer ones, into trades.</li>
            <li>Riddle answers are for solving, not for posting in the Tavern.</li>
          </ul>
        </Article>

        <Article n="VI" title="Respect the Store">
          <p>Our partner store gives the Guild a home. Treat its staff, customers and stock with respect, tidy your table when you leave, and follow the store&apos;s own rules. A store can refuse service, and its decision is final on its premises.</p>
        </Article>

        <Article n="VII" title="Consequences">
          <p>Guild Masters choose a response that fits what happened. Most problems are solved with a friendly conversation. When that isn&apos;t enough, we follow this ladder:</p>
          <ol className="mt-1 grid gap-2 sm:grid-cols-2">
            {LADDER.map(([n, t, d]) => (
              <li key={n} className="flex gap-3 rounded-sm border border-white/10 bg-white/[0.03] p-3">
                <span className="font-display text-2xl text-gold-light">{n}</span>
                <span><span className="block font-display text-lg text-parchment">{t}</span><span className="text-sm text-parchment/70">{d}</span></span>
              </li>
            ))}
          </ol>
          <p><strong>Serious incidents skip steps.</strong> Harassment, threats, violence, discrimination, or anything that affects a young adventurer&apos;s safety can lead straight to a suspension or ban.</p>
          <p><strong>Bookings during a suspension:</strong> sessions that start after your suspension ends are kept. Sessions during it must be rescheduled to a later session or canceled within the time shown in your portal; bookings left untouched are forfeited without refund. Banned accounts can cancel but not reschedule.</p>
          <p>Your character, gold and items are kept during a suspension and restored when it ends.</p>
        </Article>

        <Article n="VIII" title="Reporting a Problem & Appeals">
          <ul>
            <li><strong>At the table:</strong> tell your Guild Master, privately if you prefer. You can also step away at any time.</li>
            <li><strong>Online:</strong> use Report on the message, or tell any Guild Master.</li>
            <li><strong>About a Guild Master:</strong> tell the other founder. Every reward, card change and restriction is logged so it can be reviewed fairly.</li>
            <li>We take every report seriously and never punish anyone for reporting in good faith.</li>
            <li><strong>Appeals:</strong> if you are suspended or banned, you can appeal once from your portal. A different Guild Master from the one who made the decision reviews it, and you will see their response.</li>
          </ul>
        </Article>
      </div>

      <div className="mt-10 text-center">
        <p className="muted text-sm">Questions about this charter? Ask any Guild Master at your next session.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/join/" className="btn-gold">How to Join</Link>
          <Link href="/how-it-works/" className="btn-ghost">Guild Handbook</Link>
        </div>
      </div>
    </div>
  );
}
