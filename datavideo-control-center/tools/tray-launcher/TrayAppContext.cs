using System.Diagnostics;
using System.Drawing;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Text;
using System.Text.Json;
using System.Windows.Forms;

namespace DataVideoControlCenter.Launcher;

internal sealed class TrayAppContext : ApplicationContext
{
  private readonly NotifyIcon _trayIcon;
  private readonly ToolStripMenuItem _statusItem;
  private readonly ToolStripMenuItem _openItem;
  private readonly ToolStripMenuItem _refreshItem;
  private readonly ToolStripMenuItem _closeItem;
  private readonly string _projectDir;
  private readonly string _logPath;
  private readonly string _serverUrl;
  private readonly HttpClient _httpClient;
  private readonly System.Windows.Forms.Timer _heartbeatTimer;
  private readonly Icon _customTrayIcon;

  private Process? _serverProcess;
  private volatile bool _isExiting;
  private bool? _lastDeviceConnected;
  private bool _lastServerAvailable = true;
  private DateTime _reconnectWindowUntilUtc = DateTime.MinValue;
  private DateTime _nextReconnectAttemptUtc = DateTime.MinValue;
  private int _reconnectAttempt;

  public TrayAppContext(string[] args)
  {
    _projectDir = ResolveProjectDirectory(args);
    _serverUrl = "http://localhost:9999";
    _logPath = Path.Combine(_projectDir, "logs", "launcher.log");
    _customTrayIcon = LoadTrayIcon();
    _httpClient = new HttpClient
    {
      Timeout = TimeSpan.FromMilliseconds(1300),
    };
    _heartbeatTimer = new System.Windows.Forms.Timer
    {
      Interval = 2000,
      Enabled = false,
    };
    _heartbeatTimer.Tick += async (_, _) => await HeartbeatTickAsync();
    Directory.CreateDirectory(Path.GetDirectoryName(_logPath)!);

    _statusItem = new ToolStripMenuItem("Server: starting...");
    _statusItem.Enabled = false;

    _openItem = new ToolStripMenuItem("Open GUI");
    _openItem.Click += (_, _) => OpenGui();

    _refreshItem = new ToolStripMenuItem("Refresh");
    _refreshItem.Click += (_, _) => RefreshServer();

    _closeItem = new ToolStripMenuItem("Close");
    _closeItem.Click += (_, _) => ExitApplication();

    var menu = new ContextMenuStrip();
    menu.Items.Add(_statusItem);
    menu.Items.Add(new ToolStripSeparator());
    menu.Items.Add(_openItem);
    menu.Items.Add(_refreshItem);
    menu.Items.Add(new ToolStripSeparator());
    menu.Items.Add(_closeItem);

    _trayIcon = new NotifyIcon
    {
      Icon = _customTrayIcon,
      ContextMenuStrip = menu,
      Text = "DV Control Center",
      Visible = true,
    };
    _trayIcon.DoubleClick += (_, _) => OpenGui();

    if (!File.Exists(Path.Combine(_projectDir, "server.js")))
    {
      _heartbeatTimer.Stop();
      _statusItem.Text = "Server: not found";
      _trayIcon.ShowBalloonTip(
        4000,
        "DV Control Center",
        $"server.js not found in '{_projectDir}'",
        ToolTipIcon.Error);
      WriteLog($"ERROR: server.js not found in '{_projectDir}'");
      return;
    }

    StartServer();
  }

  protected override void Dispose(bool disposing)
  {
    if (disposing)
    {
      try { StopServer(); } catch { }
      _heartbeatTimer.Stop();
      _heartbeatTimer.Dispose();
      _httpClient.Dispose();
      _trayIcon.Visible = false;
      _trayIcon.Dispose();
      _statusItem.Dispose();
      _openItem.Dispose();
      _refreshItem.Dispose();
      _closeItem.Dispose();
      _customTrayIcon.Dispose();
    }
    base.Dispose(disposing);
  }

  private static Icon LoadTrayIcon()
  {
    const string resourceName = "DataVideoControlCenter.Launcher.assets.datavideo-favicon.ico";
    try
    {
      var asm = typeof(TrayAppContext).Assembly;
      using var stream = asm.GetManifestResourceStream(resourceName);
      if (stream == null) return SystemIcons.Application;
      using var icon = new Icon(stream);
      return (Icon)icon.Clone();
    }
    catch
    {
      return SystemIcons.Application;
    }
  }

  private static string ResolveProjectDirectory(string[] args)
  {
    var explicitPath = TryReadArgumentValue(args, "--project-dir");
    if (!string.IsNullOrWhiteSpace(explicitPath) && IsValidProjectDirectory(explicitPath))
    {
      return Path.GetFullPath(explicitPath);
    }

    var cwd = Directory.GetCurrentDirectory();
    if (IsValidProjectDirectory(cwd)) return cwd;

    var baseDir = AppContext.BaseDirectory;
    if (IsValidProjectDirectory(baseDir)) return baseDir;

    var current = new DirectoryInfo(baseDir);
    for (var i = 0; i < 16 && current != null; i++)
    {
      if (IsValidProjectDirectory(current.FullName)) return current.FullName;
      current = current.Parent;
    }

    return cwd;
  }

  private static bool IsValidProjectDirectory(string? path)
  {
    if (string.IsNullOrWhiteSpace(path)) return false;
    return File.Exists(Path.Combine(path, "server.js")) &&
           File.Exists(Path.Combine(path, "package.json"));
  }

  private static string? TryReadArgumentValue(string[] args, string key)
  {
    for (var i = 0; i < args.Length; i++)
    {
      var arg = args[i];
      if (string.Equals(arg, key, StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
      {
        return args[i + 1];
      }

      if (arg.StartsWith(key + "=", StringComparison.OrdinalIgnoreCase))
      {
        return arg[(key.Length + 1)..];
      }
    }
    return null;
  }

  private void StartServer()
  {
    if (_serverProcess != null && !_serverProcess.HasExited) return;
    if (IsPortInUse(9999))
    {
      SetStatus("Server: already running on 9999");
      WriteLog("INFO: port 9999 is already in use; server start skipped.");
      _heartbeatTimer.Start();
      return;
    }

    try
    {
      var startInfo = new ProcessStartInfo
      {
        FileName = "node",
        Arguments = "server.js",
        WorkingDirectory = _projectDir,
        UseShellExecute = false,
        CreateNoWindow = true,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
      };

      startInfo.Environment["PORT"] = "9999";

      _serverProcess = new Process
      {
        StartInfo = startInfo,
        EnableRaisingEvents = true,
      };
      _serverProcess.Exited += (_, _) =>
      {
        if (_isExiting) return;
        WriteLog("WARN: server process exited unexpectedly.");
        RunOnUiThread(() =>
        {
          SetStatus("Server: stopped");
          _trayIcon.ShowBalloonTip(2500, "DV Control Center", "Server stopped.", ToolTipIcon.Warning);
        });
      };
      _serverProcess.OutputDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) WriteLog("OUT: " + e.Data); };
      _serverProcess.ErrorDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) WriteLog("ERR: " + e.Data); };

      if (!_serverProcess.Start())
      {
        SetStatus("Server: failed to start");
        WriteLog("ERROR: Process.Start returned false.");
        return;
      }

      _serverProcess.BeginOutputReadLine();
      _serverProcess.BeginErrorReadLine();
      SetStatus("Server: running");
      WriteLog($"INFO: server started (pid={_serverProcess.Id}) in '{_projectDir}'.");
      _heartbeatTimer.Start();
    }
    catch (Exception ex)
    {
      SetStatus("Server: start error");
      WriteLog("ERROR: failed to start server: " + ex);
      _trayIcon.ShowBalloonTip(
        4000,
        "DV Control Center",
        "Failed to start server. Check logs/launcher.log and verify Node.js is installed.",
        ToolTipIcon.Error);
    }
  }

  private void StopServer()
  {
    _heartbeatTimer.Stop();
    var p = _serverProcess;
    _serverProcess = null;
    if (p == null) return;

    try
    {
      if (p.HasExited) return;
      if (!p.WaitForExit(1200))
      {
        p.Kill(entireProcessTree: true);
        p.WaitForExit(3000);
      }
      WriteLog("INFO: server stopped.");
      SetStatus("Server: stopped");
    }
    catch (Exception ex)
    {
      WriteLog("ERROR: failed to stop server: " + ex);
    }
    finally
    {
      p.Dispose();
    }
  }

  private void RefreshServer()
  {
    WriteLog("INFO: manual refresh requested.");
    if ((_serverProcess == null || _serverProcess.HasExited) && IsPortInUse(9999))
    {
      SetStatus("Server: external process on 9999");
      _trayIcon.ShowBalloonTip(2500, "DV Control Center", "Port 9999 is used by another process.", ToolTipIcon.Warning);
      return;
    }
    StopServer();
    StartServer();
  }

  private void OpenGui()
  {
    try
    {
      Process.Start(new ProcessStartInfo
      {
        FileName = _serverUrl,
        UseShellExecute = true,
      });
    }
    catch (Exception ex)
    {
      WriteLog("ERROR: failed to open GUI: " + ex);
      _trayIcon.ShowBalloonTip(2500, "DV Control Center", "Cannot open browser.", ToolTipIcon.Error);
    }
  }

  private void ExitApplication()
  {
    _isExiting = true;
    _heartbeatTimer.Stop();
    StopServer();
    _trayIcon.Visible = false;
    WriteLog("INFO: launcher exiting.");
    ExitThread();
  }

  private void SetStatus(string text)
  {
    RunOnUiThread(() => _statusItem.Text = text);
  }

  private void RunOnUiThread(Action action)
  {
    var host = _trayIcon.ContextMenuStrip;
    if (host != null && host.IsHandleCreated && host.InvokeRequired)
    {
      host.BeginInvoke(action);
      return;
    }
    action();
  }

  private void WriteLog(string line)
  {
    var ts = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
    var fullLine = $"{ts} {line}{Environment.NewLine}";
    try
    {
      File.AppendAllText(_logPath, fullLine, Encoding.UTF8);
    }
    catch
    {
      // ignore logging failures
    }
  }

  private static bool IsPortInUse(int port)
  {
    try
    {
      var props = IPGlobalProperties.GetIPGlobalProperties();
      return props.GetActiveTcpListeners().Any(ep => ep.Port == port);
    }
    catch
    {
      return false;
    }
  }

  private async Task HeartbeatTickAsync()
  {
    if (_isExiting) return;

    if (_serverProcess == null || _serverProcess.HasExited)
    {
      if (_lastServerAvailable)
      {
        _lastServerAvailable = false;
        SetStatus("Server: stopped");
      }
      return;
    }

    var snapshot = await TryFetchStateAsync();
    if (snapshot == null)
    {
      if (_lastServerAvailable)
      {
        _lastServerAvailable = false;
        SetStatus("Server: running | API unavailable");
        WriteLog("WARN: heartbeat failed, local API unavailable.");
      }
      return;
    }

    if (!_lastServerAvailable)
    {
      _lastServerAvailable = true;
      WriteLog("INFO: local API heartbeat restored.");
    }

    var connected = snapshot.ConnectionConnected;
    var hostDisplay = string.IsNullOrWhiteSpace(snapshot.ConnectionHost) ? "n/a" : snapshot.ConnectionHost;

    if (connected)
    {
      SetStatus($"Server: running | Device: connected ({hostDisplay})");
      if (_lastDeviceConnected != true)
      {
        _trayIcon.ShowBalloonTip(2200, "DV Control Center", "Соединение с пультом установлено.", ToolTipIcon.Info);
        WriteLog($"INFO: switcher connection established to {hostDisplay}:{snapshot.CommandPort}/{snapshot.RealtimePort}.");
      }
      _lastDeviceConnected = true;
      _reconnectAttempt = 0;
      _reconnectWindowUntilUtc = DateTime.MinValue;
      _nextReconnectAttemptUtc = DateTime.MinValue;
      return;
    }

    SetStatus($"Server: running | Device: disconnected ({hostDisplay})");
    if (_lastDeviceConnected != false)
    {
      _trayIcon.ShowBalloonTip(3500, "DV Control Center", "Нет подключения к пульту. Запущено авто-подключение (до 1 минуты).", ToolTipIcon.Warning);
      WriteLog("WARN: switcher disconnected; auto-reconnect started (1 minute window).");
      _reconnectWindowUntilUtc = DateTime.UtcNow.AddMinutes(1);
      _nextReconnectAttemptUtc = DateTime.UtcNow;
      _reconnectAttempt = 0;
    }
    _lastDeviceConnected = false;

    if (snapshot.SavedConnectionHost == null) return;
    await TryReconnectIfDueAsync(snapshot);
  }

  private async Task TryReconnectIfDueAsync(ConnectionSnapshot snapshot)
  {
    var now = DateTime.UtcNow;
    if (now > _reconnectWindowUntilUtc) return;
    if (now < _nextReconnectAttemptUtc) return;

    _reconnectAttempt += 1;
    var ok = await PostConnectAsync(snapshot.SavedConnectionHost, snapshot.SavedRealtimePort, snapshot.SavedCommandPort);
    WriteLog(ok
      ? $"INFO: auto-reconnect attempt #{_reconnectAttempt} sent."
      : $"WARN: auto-reconnect attempt #{_reconnectAttempt} failed.");

    var delay = GetReconnectDelaySeconds(_reconnectAttempt);
    _nextReconnectAttemptUtc = DateTime.UtcNow.AddSeconds(delay);
  }

  private static int GetReconnectDelaySeconds(int attempt)
  {
    // Gentle backoff to avoid aggressive traffic to switcher.
    return attempt switch
    {
      <= 1 => 2,
      2 => 4,
      3 => 7,
      4 => 10,
      _ => 12,
    };
  }

  private async Task<bool> PostConnectAsync(string? host, int realtimePort, int commandPort)
  {
    try
    {
      var payload = JsonSerializer.Serialize(new
      {
        host,
        realtimePort,
        commandPort,
      });
      using var content = new StringContent(payload, Encoding.UTF8, "application/json");
      using var response = await _httpClient.PostAsync($"{_serverUrl}/api/connect", content);
      return response.IsSuccessStatusCode;
    }
    catch
    {
      return false;
    }
  }

  private async Task<ConnectionSnapshot?> TryFetchStateAsync()
  {
    try
    {
      using var response = await _httpClient.GetAsync($"{_serverUrl}/api/state");
      if (!response.IsSuccessStatusCode) return null;

      await using var stream = await response.Content.ReadAsStreamAsync();
      using var doc = await JsonDocument.ParseAsync(stream);
      var root = doc.RootElement;

      var connection = root.TryGetProperty("connection", out var c) ? c : default;
      var saved = root.TryGetProperty("connectionConfig", out var cc) ? cc : default;

      var snapshot = new ConnectionSnapshot
      {
        ConnectionConnected = ReadBool(connection, "connected"),
        ConnectionHost = ReadString(connection, "host"),
        RealtimePort = ReadInt(connection, "realtimePort", 0),
        CommandPort = ReadInt(connection, "commandPort", 0),
        SavedConnectionHost = ReadString(saved, "host"),
        SavedRealtimePort = ReadInt(saved, "realtimePort", 5001),
        SavedCommandPort = ReadInt(saved, "commandPort", 5002),
      };

      return snapshot;
    }
    catch
    {
      return null;
    }
  }

  private static bool ReadBool(JsonElement element, string name)
  {
    if (element.ValueKind != JsonValueKind.Object) return false;
    if (!element.TryGetProperty(name, out var value)) return false;
    return value.ValueKind == JsonValueKind.True || (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var b) && b);
  }

  private static string? ReadString(JsonElement element, string name)
  {
    if (element.ValueKind != JsonValueKind.Object) return null;
    if (!element.TryGetProperty(name, out var value)) return null;
    return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
  }

  private static int ReadInt(JsonElement element, string name, int fallback)
  {
    if (element.ValueKind != JsonValueKind.Object) return fallback;
    if (!element.TryGetProperty(name, out var value)) return fallback;
    if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var n)) return n;
    if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var s)) return s;
    return fallback;
  }

  private sealed class ConnectionSnapshot
  {
    public bool ConnectionConnected { get; init; }
    public string? ConnectionHost { get; init; }
    public int RealtimePort { get; init; }
    public int CommandPort { get; init; }
    public string? SavedConnectionHost { get; init; }
    public int SavedRealtimePort { get; init; }
    public int SavedCommandPort { get; init; }
  }
}


