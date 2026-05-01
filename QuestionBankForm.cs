using Microsoft.AspNetCore.Components.WebView.WindowsForms;
using Microsoft.Extensions.DependencyInjection;
using System.Runtime.InteropServices;

namespace QuestionBank
{
    public partial class QuestionBankForm : Form
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        private const uint WDA_NONE = 0x00000000;
        private const uint WDA_MONITOR = 0x00000001;

        public QuestionBankForm()
        {
            InitializeComponent();
            var services = new ServiceCollection();
            // Register HttpClient with a base address so static assets (wwwroot) can be fetched in WebView
            services.AddScoped(sp => new System.Net.Http.HttpClient { BaseAddress = new Uri("http://localhost/") });
            services.AddWindowsFormsBlazorWebView();
            blazorWebView.HostPage = "wwwroot/index.html";
            blazorWebView.Services = services.BuildServiceProvider();
            blazorWebView.RootComponents.Add<Main>("#app");

            // Console capture disabled: rely on in-page JS logger (app.getLogs) for diagnostics.
        }

        private void QuestionBankForm_Load(object sender, EventArgs e)
        {
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            SetWindowDisplayAffinity(this.Handle, WDA_MONITOR);
        }
    }
}
