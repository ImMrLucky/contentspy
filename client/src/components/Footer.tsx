import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up mr-2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
              <h2 className="text-xl font-medium">ContentCompete</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1">Competitive content analysis made easy</p>
          </div>
          
          <div className="flex space-x-8">
            <div>
              <h3 className="font-medium mb-2">Product</h3>
              <ul className="space-y-1 text-sm text-gray-400">
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Features</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Pricing</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Integrations</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Updates</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Resources</h3>
              <ul className="space-y-1 text-sm text-gray-400">
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Documentation</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">API</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Guides</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Blog</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Company</h3>
              <ul className="space-y-1 text-sm text-gray-400">
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">About</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Contact</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Careers</li>
                <li className="hover:text-white transition-colors duration-200 cursor-pointer">Legal</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-400">
            © {currentYear} ContentCompete. All rights reserved.
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <span className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </span>
            <span className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
            </span>
            <span className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
