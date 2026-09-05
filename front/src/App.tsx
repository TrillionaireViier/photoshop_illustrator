import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { MousePointer2, Paintbrush, Eraser, Square, Circle, Layers, Trash2, LogIn, LogOut } from 'lucide-react';
import './index.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#5c67ff');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [layers, setLayers] = useState<any[]>([]);
  
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
        isDrawingMode: false,
      });

      setCanvas(initCanvas);

      initCanvas.on('object:added', () => updateLayers(initCanvas));
      initCanvas.on('object:removed', () => updateLayers(initCanvas));
      initCanvas.on('object:modified', () => updateLayers(initCanvas));
      
      // Load from local storage if exists
      const savedData = localStorage.getItem('photoshop-clone-data');
      if (savedData) {
        initCanvas.loadFromJSON(savedData, () => {
          initCanvas.renderAll();
          updateLayers(initCanvas);
        });
      }

      return () => {
        initCanvas.dispose();
      };
    }
  }, []);

  const updateLayers = (canvasInstance: fabric.Canvas = canvas!) => {
    if (!canvasInstance) return;
    const objs = canvasInstance.getObjects();
    setLayers([...objs].reverse());
  };

  // Handle Tool Changes
  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.forEachObject(o => o.set('selectable', true));

    if (activeTool === 'brush') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
      }
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = strokeWidth * 2;
      }
    } else if (activeTool === 'rectangle' || activeTool === 'circle') {
      canvas.selection = false;
      canvas.forEachObject(o => o.set('selectable', false));
    }
  }, [activeTool, canvas, strokeColor, strokeWidth]);

  const addShape = (type: string) => {
    if (!canvas) return;
    
    let shape;
    const commonOpts = {
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    };

    if (type === 'rectangle') {
      shape = new fabric.Rect({ ...commonOpts, width: 100, height: 100 });
    } else if (type === 'circle') {
      shape = new fabric.Circle({ ...commonOpts, radius: 50 });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      setActiveTool('select');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
        setShowLogin(false);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Could not connect to backend server');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  const handleSave = async () => {
    if (!canvas) return;
    
    // Save to LocalStorage
    const data = JSON.stringify(canvas.toJSON());
    localStorage.setItem('photoshop-clone-data', data);
    
    // Optional: Send to Backend if token exists
    if (token) {
      try {
        const res = await fetch('http://localhost:5000/api/projects', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ projectData: data })
        });
        const result = await res.json();
        if (result.status === 'success') {
          alert('Project saved successfully to the database!');
        } else {
          alert('Failed to save to database. Saved locally instead.');
        }
      } catch (e) {
        alert('Backend not running. Saved locally!');
      }
    } else {
      alert('Saved locally! Log in as admin to save to the backend database.');
    }
  };

  const handleExport = () => {
    if (!canvas) return;
    // ensure everything is rendered
    canvas.renderAll();
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    const link = document.createElement('a');
    link.download = 'my-design.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      updateLayers(canvas);
      localStorage.removeItem('photoshop-clone-data');
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Login Modal */}
      {showLogin && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <form onSubmit={handleLogin} style={{
            background: 'var(--panel-bg)', padding: '30px', borderRadius: '12px',
            border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px',
            width: '300px'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Admin Login</h3>
            {loginError && <div style={{ color: 'var(--danger-color)', fontSize: '14px', textAlign: 'center' }}>{loginError}</div>}
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                   style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                   style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#fff' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Login</button>
              <button type="button" onClick={() => setShowLogin(false)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Topbar */}
      <header className="topbar">
        <div className="logo-section">
          <div style={{ width: 24, height: 24, background: 'var(--primary-color)', borderRadius: 6 }}></div>
          PS | AI Clone
        </div>
        <div className="menu-items">
          <div className="menu-item" onClick={clearCanvas}>New</div>
          <div className="menu-item" onClick={handleSave}>Save</div>
          <div className="menu-item" onClick={handleExport}>Export</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {token ? (
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LogOut size={16} /> Logout
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <LogIn size={16} /> Admin Login
            </button>
          )}
        </div>
      </header>

      {/* Workspace */}
      <div className="workspace">
        {/* Toolbar */}
        <aside className="toolbar glass-panel">
          <button className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Select Tool">
            <MousePointer2 size={20} />
          </button>
          <button className={`tool-btn ${activeTool === 'brush' ? 'active' : ''}`} onClick={() => setActiveTool('brush')} title="Brush Tool">
            <Paintbrush size={20} />
          </button>
          <button className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="Eraser Tool">
            <Eraser size={20} />
          </button>
          <div style={{ height: 1, width: '60%', background: 'var(--border-color)', margin: '5px 0' }}></div>
          <button className="tool-btn" onClick={() => addShape('rectangle')} title="Add Rectangle">
            <Square size={20} />
          </button>
          <button className="tool-btn" onClick={() => addShape('circle')} title="Add Circle">
            <Circle size={20} />
          </button>
        </aside>

        {/* Canvas Area */}
        <main className="canvas-area">
          <div className="canvas-container-inner">
            <canvas ref={canvasRef} />
          </div>
        </main>

        {/* Properties & Layers */}
        <aside className="properties-panel glass-panel">
          <div className="panel-header">Properties</div>
          <div className="panel-content">
            <div className="control-group">
              <span className="control-label">Stroke Color</span>
              <input type="color" className="color-picker" value={strokeColor} onChange={(e) => {
                setStrokeColor(e.target.value);
                if (canvas && canvas.getActiveObject()) {
                  canvas.getActiveObject()?.set('stroke', e.target.value);
                  if(canvas.getActiveObject()?.type === 'path') {
                    canvas.getActiveObject()?.set('stroke', e.target.value);
                  }
                  canvas.renderAll();
                }
              }} />
            </div>
            <div className="control-group">
              <span className="control-label">Stroke Width: {strokeWidth}px</span>
              <input type="range" min="1" max="50" value={strokeWidth} onChange={(e) => {
                setStrokeWidth(Number(e.target.value));
                if (canvas && canvas.getActiveObject()) {
                  canvas.getActiveObject()?.set('strokeWidth', Number(e.target.value));
                  canvas.renderAll();
                }
              }} />
            </div>
          </div>

          <div className="panel-header" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Layers</span>
              <Layers size={14} />
            </div>
          </div>
          <div className="panel-content" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="layers-list">
              {layers.map((layer, index) => (
                <div key={index} className={`layer-item ${canvas?.getActiveObject() === layer ? 'active' : ''}`} onClick={() => {
                  canvas?.setActiveObject(layer);
                  canvas?.renderAll();
                }}>
                  <span>Layer {layers.length - index} ({layer.type})</span>
                  <div className="layer-actions">
                    <button className="layer-btn" onClick={(e) => {
                      e.stopPropagation();
                      canvas?.remove(layer);
                    }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {layers.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No layers yet
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
