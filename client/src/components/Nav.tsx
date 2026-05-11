import { Link, useLocation } from 'wouter';
import HeviniMark from './HeviniMark';

export default function Nav() {
  const [location] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0A0A0A] border-b border-[#1a1a1a]">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 no-underline text-white">
          <HeviniMark size={34} className="text-white flex-shrink-0" />
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-xl font-black tracking-tighter text-white leading-none">10IS</span>
            <span className="text-[9px] text-net-grey tracking-widest uppercase leading-none">Powered by Hevini Sporting</span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/rackets"
            className={`text-[11px] font-semibold tracking-widest uppercase transition-colors no-underline ${location === '/rackets' ? 'text-white' : 'text-net-grey hover:text-white'}`}
          >
            Rackets
          </Link>
          <Link
            href="/stringers"
            className={`text-[11px] font-semibold tracking-widest uppercase transition-colors no-underline ${location === '/stringers' ? 'text-white' : 'text-net-grey hover:text-white'}`}
          >
            Stringers
          </Link>
          <Link
            href="/onboarding"
            className="bg-hevini-red text-white text-[11px] font-bold tracking-widest uppercase px-4 py-2 hover:bg-red-700 transition-colors no-underline"
            style={{ borderRadius: '2px' }}
          >
            Get Setup
          </Link>
        </div>
      </div>
    </nav>
  );
}
