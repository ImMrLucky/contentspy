import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          <Link href="/">
            <h1 className="text-xl font-medium cursor-pointer">ContentCompete</h1>
          </Link>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link href="/">
                <span className={`transition-colors duration-200 ${location === "/" ? "font-medium" : "hover:text-gray-200"}`}>Home</span>
              </Link>
            </li>
            <li>
              <Link href="/history">
                <span className={`transition-colors duration-200 ${location === "/history" ? "font-medium" : "hover:text-gray-200"}`}>History</span>
              </Link>
            </li>
            <li>
              <Link href="/reports">
                <span className={`transition-colors duration-200 ${location === "/reports" ? "font-medium" : "hover:text-gray-200"}`}>Reports</span>
              </Link>
            </li>
            <li>
              <Link href="/settings">
                <span className={`transition-colors duration-200 ${location === "/settings" ? "font-medium" : "hover:text-gray-200"}`}>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
