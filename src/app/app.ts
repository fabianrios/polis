import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Chart from 'chart.js/auto';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected title = 'polisfront';
  protected searchTerm = '';
  protected isContentVisible = true;
  hits: any[] = [];
  sources: string[] = [];
  filteredHitsBySource: { [key: string]: any[] } = {};
  private chartInstance: Chart | null = null;
  visibleSources = new Set<string>();

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Set Chart.js global font family to Inter
    Chart.defaults.font.family = "'Inter', Arial, Helvetica, sans-serif";
    Chart.defaults.color = "#E2E8F0";

    this.http.get<any>('/hits.json').subscribe(data => {
      this.hits = data.hits;
      this.sources = Array.from(new Set(this.hits.map(h => h.source)));
      this.sources.forEach(s => this.visibleSources.add(s));
      this.filterHits();
      setTimeout(() => this.renderGraph(), 0);
    });
  }

  public onSearch() {
    this.filterHits();
  }

  protected filterHits() {
    const term = this.searchTerm.toLowerCase();
    this.filteredHitsBySource = {};
    this.sources.forEach(source => {
      this.filteredHitsBySource[source] = this.hits.filter(
        h =>
          h.source === source &&
          (h.title.toLowerCase().includes(term) ||
            h.body.toLowerCase().includes(term))
      );
    });

    // After filtering hits, re-render the graph
    this.renderGraph();
  }

  protected toggleSource(source: string) {
    if (this.visibleSources.has(source)) {
      this.visibleSources.delete(source);
    } else {
      this.visibleSources.add(source);
    }
    this.renderGraph();
  }

  protected isSourceVisible(source: string): boolean {
    return this.visibleSources.has(source);
  }

  getArticleUrl(article: any) {
    if (article.url.startsWith('http')) return article.url;
    return article.url.startsWith('/') ? article.url : '/' + article.url;
  }

  private renderGraph() {
    // Destroy the previous chart instance if it exists
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const ctx = (document.getElementById('werteGraph') as HTMLCanvasElement)?.getContext('2d');
    if (!ctx) return;

    // Prepare the filtered dataset for the graph
    const filteredData = Object.keys(this.filteredHitsBySource)
      .filter(source => this.isSourceVisible(source)) // Only include visible sources
      .flatMap(source => this.filteredHitsBySource[source]);

    const data = filteredData.map(w => ({
      x: Number(w.bias),
      y: Number(w.opinion),
      label: w.title + ' (' + w.source + ')'
    }));

    // Split data into two groups: y >= 0 (blue), y < 0 (orange)
    const bluePoints = data.filter(d => d.y >= 0);
    const orangePoints = data.filter(d => d.y < 0);

    // Recreate the chart using the filtered data
    this.chartInstance = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Faktisch',
            data: bluePoints,
            pointRadius: 8,
            backgroundColor: '#4299E1'
          },
          {
            label: 'Meinungsbetont',
            data: orangePoints,
            pointRadius: 8,
            backgroundColor: '#FF7A59'
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#E2E8F0',
              font: { family: "'Inter', Arial, Helvetica, sans-serif", size: 14 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ctx.raw.label + ` (P: ${ctx.raw.x}, J: ${ctx.raw.y})`
            },
            backgroundColor: '#0A192F',
            titleColor: '#F8F9FA',
            bodyColor: '#A0AEC0',
            titleFont: { size: 14, weight: 'bold', family: "'Inter', Arial, Helvetica, sans-serif" },
            bodyFont: { size: 12, family: "'Inter', Arial, Helvetica, sans-serif" },
            padding: 12,
            cornerRadius: 8,
            borderColor: '#4A5568',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Politische Position (Links ↔ Rechts)', color: '#A0AEC0', font: { size: 14, weight: 'bold', family: "'Inter', Arial, Helvetica, sans-serif" } },
            min: -5,
            max: 5,
            grid: {
              color: (context: any) => context.tick.value === 0 ? 'rgba(226, 232, 240, 0.6)' : 'rgba(74, 85, 104, 0.4)',
              lineWidth: (context: any) => context.tick.value === 0 ? 2 : 1
            },
            ticks: { color: '#A0AEC0', font: { family: "'Inter', Arial, Helvetica, sans-serif" } }
          },
          y: {
            title: { display: true, text: 'Journalistischer Ansatz (Meinung ↔ Fakt)', color: '#A0AEC0', font: { size: 14, weight: 'bold', family: "'Inter', Arial, Helvetica, sans-serif" } },
            min: -5,
            max: 5,
            grid: {
              color: (context: any) => context.tick.value === 0 ? 'rgba(226, 232, 240, 0.6)' : 'rgba(74, 85, 104, 0.4)',
              lineWidth: (context: any) => context.tick.value === 0 ? 2 : 1
            },
            ticks: { color: '#A0AEC0', font: { family: "'Inter', Arial, Helvetica, sans-serif" } }
          }
        }
      }
    });
  }
}
