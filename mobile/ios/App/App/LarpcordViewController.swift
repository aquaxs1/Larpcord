import Capacitor
import WebKit

/// Larpcord for iOS: Discord's web app in a WKWebView, with the Larpcord core (Vencord fork)
/// injected before Discord's own scripts run, so its webpack patches apply like on the desktop.
class LarpcordViewController: CAPBridgeViewController {

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let configuration = super.webViewConfiguration(for: instanceConfiguration)

        // larpcord-inject.js is copied from mobile/www into the app's public folder by "cap sync"
        if let url = Bundle.main.url(forResource: "larpcord-inject", withExtension: "js", subdirectory: "public"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            configuration.userContentController.addUserScript(script)
        } else {
            CAPLog.print("⚡️ Larpcord: larpcord-inject.js missing, Discord loads without Larpcord")
        }
        return configuration
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        if #available(iOS 16.4, *) {
            // Lets Safari's Web Inspector attach, like DevTools on the desktop
            webView?.isInspectable = true
        }
    }
}
