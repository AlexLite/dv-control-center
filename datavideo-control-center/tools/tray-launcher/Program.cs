using System.Threading;
using System.Windows.Forms;

namespace DataVideoControlCenter.Launcher;

internal static class Program
{
  private static Mutex? _singleInstanceMutex;

  [STAThread]
  private static void Main(string[] args)
  {
    var createdNew = false;
    _singleInstanceMutex = new Mutex(true, @"Local\DataVideoControlCenterTrayLauncher", out createdNew);
    if (!createdNew)
    {
      MessageBox.Show(
        "Launcher is already running.",
        "DV Control Center",
        MessageBoxButtons.OK,
        MessageBoxIcon.Information);
      return;
    }

    ApplicationConfiguration.Initialize();
    Application.Run(new TrayAppContext(args));
  }
}
