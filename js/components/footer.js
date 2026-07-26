// ========================================================
// SWIFT EXPRESS LOGISTICS - FOOTER COMPONENT
// ========================================================

export function renderFooter() {
  const footerContainer = document.getElementById('footer-container');
  if (!footerContainer) return;

  const siteRootUrl = new URL('../../', import.meta.url);
  const buildSiteHref = (path) => new URL(path, siteRootUrl).pathname;

  footerContainer.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="${buildSiteHref('index.html')}" class="brand-logo" style="color: #ffffff;">
              <div class="brand-icon"><i class="fas fa-shipping-fast"></i></div>
              SWIFT<span style="color: var(--accent);">EXPRESS</span>
            </a>
            <p>Swift Express Logistics is a global leader in door-to-door courier services, air & ocean freight forwarding, e-commerce fulfillment, and supply chain solutions.</p>
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem; font-size: 1.2rem;">
              <a href="#" style="color: #94A3B8;"><i class="fab fa-facebook-f"></i></a>
              <a href="#" style="color: #94A3B8;"><i class="fab fa-twitter"></i></a>
              <a href="#" style="color: #94A3B8;"><i class="fab fa-linkedin-in"></i></a>
              <a href="#" style="color: #94A3B8;"><i class="fab fa-instagram"></i></a>
            </div>
          </div>

          <div>
            <h4 class="footer-title">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="${buildSiteHref('about.html')}">About Swift Express</a></li>
              <li><a href="${buildSiteHref('services.html')}">Our Courier Services</a></li>
              <li><a href="${buildSiteHref('tracking.html')}">Live Package Tracking</a></li>
              <li><a href="${buildSiteHref('pricing.html')}">Shipping Rate Calculator</a></li>
              <li><a href="${buildSiteHref('careers.html')}">Careers & Opportunities</a></li>
              <li><a href="${buildSiteHref('blog.html')}">Latest News & Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-title">Logistics Services</h4>
            <ul class="footer-links">
              <li><a href="${buildSiteHref('service-details.html')}?service=air-freight">Air Freight Express</a></li>
              <li><a href="${buildSiteHref('service-details.html')}?service=sea-freight">Ocean Sea Cargo</a></li>
              <li><a href="${buildSiteHref('service-details.html')}?service=road-freight">Road & Truck Freight</a></li>
              <li><a href="${buildSiteHref('service-details.html')}?service=customs">Customs Clearance</a></li>
              <li><a href="${buildSiteHref('service-details.html')}?service=warehousing">Global Warehousing</a></li>
              <li><a href="${buildSiteHref('service-details.html')}?service=fulfillment">E-Commerce Fulfillment</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-title">Contact Us</h4>
            <ul class="footer-links" style="font-size: 0.9rem;">
              <li><i class="fas fa-map-marker-alt text-accent" style="width: 20px;"></i>4080, Jenkins Road
Chattanooga, TN 37421 USA</li>
              <li><i class="fas fa-phone-alt text-accent" style="width: 20px;"></i> <a href="tel:+17757570577" style="color: inherit; font-weight: 700;">+1 (775) 757-0577</a></li>
              <li><i class="fas fa-envelope text-accent" style="width: 20px;"></i> <a href="mailto:support@swiftexpresslogix.com" style="color: inherit; font-weight: 700;">support@swiftexpresslogix.com</a></li>
              <li><i class="fas fa-clock text-accent" style="width: 20px;"></i> Mon - Sat: 8:00 AM - 9:00 PM EST</li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div>&copy; 2026 Swift Express Logistics Inc. All rights reserved.</div>
          <div style="display: flex; gap: 1.5rem;">
            <a href="${buildSiteHref('privacy.html')}">Privacy Policy</a>
            <a href="${buildSiteHref('terms.html')}">Terms & Conditions</a>
            <a href="${buildSiteHref('admin/index.html')}">Admin Portal</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}
