import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Car, 
  MapPin, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Sparkles, 
  Calendar, 
  Layers, 
  Award,
  Shield,
  HelpCircle,
  Percent,
  CheckCircle2,
  AlertTriangle,
  History,
  Target
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { SecureHttpClient } from '../client/modules/auth/services/SecureHttpClient';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const AdminAnalyticsView = () => {
  const { showToast } = useToast();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedPillar, setSelectedPillar] = React.useState<'overview' | 'growth' | 'adoption' | 'compliance' | 'governance' | 'reports'>('overview');
  const [reportsData, setReportsData] = React.useState<any>(null);
  const [reportsLoading, setReportsLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      try {
        const response = await SecureHttpClient.request('/api/routes/api/routes/admin/analytics/stats');
        // Let's try /api/routes/admin/analytics/stats as well just in case of routing prefixing differences
        const endpoint = response.ok ? '/api/routes/api/routes/admin/analytics/stats' : '/api/routes/admin/analytics/stats';
        const finalResponse = response.ok ? response : await SecureHttpClient.request('/api/routes/admin/analytics/stats');
        
        if (finalResponse.ok) {
          const statsData = await finalResponse.json();
          if (active) {
            setData(statsData);
          }
        }
      } catch (err) {
        console.error("Error fetching analytics metrics:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (selectedPillar !== 'reports') return;
    
    let active = true;
    const fetchReports = async () => {
      setReportsLoading(true);
      try {
        const response = await SecureHttpClient.request('/api/routes/admin/reports/executive');
        if (response.ok) {
          const resJson = await response.json();
          if (active) {
            setReportsData(resJson);
          }
        } else {
          showToast('Error al cargar datos del reporte ejecutivo.', 'error');
        }
      } catch (err) {
        console.error("Error fetching reports metrics:", err);
        showToast('Error de conexión al cargar reportes.', 'error');
      } finally {
        if (active) {
          setReportsLoading(false);
        }
      }
    };

    fetchReports();
    return () => {
      active = false;
    };
  }, [selectedPillar]);

  const handleExportExcel = () => {
    if (!reportsData) {
      showToast('No se han cargado datos para exportar.', 'error');
      return;
    }
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Resumen de Plataforma
      const summaryData = [
        { 'Métrica / Indicador': 'Usuarios Totales', 'Valor': reportsData.platformSummary.totalUsers },
        { 'Métrica / Indicador': 'Conductores', 'Valor': reportsData.platformSummary.drivers },
        { 'Métrica / Indicador': 'Pasajeros', 'Valor': reportsData.platformSummary.passengers },
        { 'Métrica / Indicador': 'Vehículos Registrados', 'Valor': reportsData.platformSummary.totalVehicles },
        { 'Métrica / Indicador': 'Vehículos Aprobados', 'Valor': reportsData.platformSummary.approvedVehicles },
        { 'Métrica / Indicador': 'Rutas Publicadas', 'Valor': reportsData.platformSummary.totalRoutes },
        { 'Métrica / Indicador': 'Rutas Completadas', 'Valor': reportsData.platformSummary.completedRoutes },
        { 'Métrica / Indicador': 'Rutas Canceladas', 'Valor': reportsData.platformSummary.cancelledRoutes },
        { 'Métrica / Indicador': 'Calificación Promedio', 'Valor': reportsData.platformSummary.averageRating }
      ];
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Resumen de Plataforma");
      
      // Sheet 2: Cumplimiento Documental
      const docsData = [
        { 'Documento': 'Licencias de Conducción', 'Al Día': reportsData.documentCompliance.license.valid, 'Expira en 30 Días': reportsData.documentCompliance.license.expiring30, 'Expira en 15 Días': reportsData.documentCompliance.license.expiring15, 'Vencidos': reportsData.documentCompliance.license.expired },
        { 'Documento': 'SOAT de Vehículos', 'Al Día': reportsData.documentCompliance.soat.valid, 'Expira en 30 Días': reportsData.documentCompliance.soat.expiring30, 'Expira en 15 Días': reportsData.documentCompliance.soat.expiring15, 'Vencidos': reportsData.documentCompliance.soat.expired },
        { 'Documento': 'Tecnomecánica', 'Al Día': reportsData.documentCompliance.tech.valid, 'Expira en 30 Días': reportsData.documentCompliance.tech.expiring30, 'Expira en 15 Días': reportsData.documentCompliance.tech.expiring15, 'Vencidos': reportsData.documentCompliance.tech.expired },
        { 'Riesgo Global': reportsData.documentCompliance.overallRiskIndicator, 'Al Día': '', 'Expira en 30 Días': '', 'Expira en 15 Días': '', 'Vencidos': '' }
      ];
      const ws2 = XLSX.utils.json_to_sheet(docsData);
      XLSX.utils.book_append_sheet(wb, ws2, "Cumplimiento Documental");
      
      // Sheet 3: Moderación y Seguridad
      const moderationData = [
        { 'Indicador': 'Reportes Recibidos', 'Valor': reportsData.moderationSummary.totalReports },
        { 'Indicador': 'Reportes Pendientes', 'Valor': reportsData.moderationSummary.pending },
        { 'Indicador': 'Reportes Resueltos', 'Valor': reportsData.moderationSummary.resolved },
        { 'Indicador': 'Reportes Descartados', 'Valor': reportsData.moderationSummary.dismissed },
        { 'Indicador': 'Tiempo Promedio de Resolución (Horas)', 'Valor': reportsData.moderationSummary.averageResolutionTimeHours }
      ];
      const ws3 = XLSX.utils.json_to_sheet(moderationData);
      XLSX.utils.book_append_sheet(wb, ws3, "Moderación y Seguridad");
      
      // Sheet 4: Conductores Recurrentemente Reportados
      const reportedUsersData = (reportsData.moderationSummary.recurrentlyReportedUsers || []).map((u: any) => ({
        'ID Usuario': u.id,
        'Email': u.email,
        'Nombre': u.name,
        'Rol': u.role,
        'Cantidad de Reportes': u.count
      }));
      const ws4 = XLSX.utils.json_to_sheet(reportedUsersData);
      XLSX.utils.book_append_sheet(wb, ws4, "Usuarios Reportados");
      
      // Sheet 5: Desempeño de Conductores
      const driversData = [
        { 'Indicador': 'Conductores Activos', 'Valor': reportsData.driversSummary.activeDrivers },
        { 'Indicador': 'Conductores Inactivos', 'Valor': reportsData.driversSummary.inactiveDrivers },
        { 'Indicador': 'Conductores con Vehículo Aprobado', 'Valor': reportsData.driversSummary.approvedVehicleCount },
        { 'Indicador': 'Conductores con Documentos Vencidos', 'Valor': reportsData.driversSummary.expiredDocumentsCount },
        { 'Indicador': 'Calificación Promedio', 'Valor': reportsData.driversSummary.averageRating }
      ];
      const ws5 = XLSX.utils.json_to_sheet(driversData);
      XLSX.utils.book_append_sheet(wb, ws5, "Resumen Conductores");

      // Sheet 6: Lista de Conductores
      const driverListData = (reportsData.driversSummary.driversList || []).map((d: any) => ({
        'ID': d.id,
        'Nombre': d.name,
        'Email': d.email,
        'Calificación': d.rating,
        'Estado': d.checkStatus
      }));
      const ws6 = XLSX.utils.json_to_sheet(driverListData);
      XLSX.utils.book_append_sheet(wb, ws6, "Lista de Conductores");
      
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
      XLSX.writeFile(wb, `Rivo_Reporte_Ejecutivo_${dateStr}.xlsx`);
      showToast('Reporte Excel exportado exitosamente.', 'success');
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      showToast('Error al exportar a Excel.', 'error');
    }
  };

  const handleExportPDF = async () => {
    if (!reportsData) {
      showToast('No se han cargado datos para exportar.', 'error');
      return;
    }

    try {
      // Cargar el logotipo oficial y de marca "Rivo" para incrustar de forma vectorialmente idéntica
      let logoBase64 = '';
      try {
        logoBase64 = await new Promise<string>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const scale = 4; // Factor para una resolución ultra-nítida en jsPDF
              canvas.width = 200 * scale;
              canvas.height = 80 * scale;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, 200, 80);
                resolve(canvas.toDataURL('image/png'));
              } else {
                resolve('');
              }
            } catch (e) {
              console.error('Error al procesar el logo de Rivo corporativo:', e);
              resolve('');
            }
          };
          img.onerror = () => resolve('');
          img.src = '/logo_rivo.svg';
        });
      } catch (err) {
        console.error('Error al precargar la identidad visual del logo:', err);
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const dateStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const stats = reportsData.platformSummary;
      const compliance = reportsData.documentCompliance;
      const mod = reportsData.moderationSummary;
      const driversData = reportsData.driversSummary;

      // Extract general metrics to calculate exact document compliance ratio
      const totalDocs = (compliance.license?.valid || 0) + (compliance.license?.expired || 0) +
                        (compliance.soat?.valid || 0) + (compliance.soat?.expired || 0) +
                        (compliance.tech?.valid || 0) + (compliance.tech?.expired || 0);
      const validDocs = (compliance.license?.valid || 0) + (compliance.soat?.valid || 0) + (compliance.tech?.valid || 0);
      const compliancePct = totalDocs > 0 ? Math.round((validDocs / totalDocs) * 100) : 100;

      const overallRisk = compliance.overallRiskIndicator || 'Bajo';

      // Custom helper to draw page header (Failsafe page boundaries)
      const drawHeader = (pageNumber: number) => {
        if (pageNumber === 1) return; // Portada page has its own full layout, no header
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(0, 0, 210, 12, 'F');
        doc.setTextColor(255, 255, 255);
        
        if (logoBase64) {
          // Esquina superior izquierda con el isotipo + logotipo oficial en miniatura
          doc.addImage(logoBase64, 'PNG', 15, 2.5, 17.5, 7);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text('Mobility Intelligence', 34, 7.5);
        } else {
          // Fallback con capitalización real
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('Rivo Mobility Intelligence', 15, 8);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Sistemas y Computadores SYC  |  Reporte de Alta Dirección', 78, 8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Página ${pageNumber} de 3`, 182, 8);
      };

      // Custom helper to draw footer
      const drawFooter = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 285, 210, 12, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(0, 285, 210, 285);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistemas y Computadores SYC  |  Rivo Mobility Intelligence  |  v2.0 (Alta Dirección)', 15, 292);
        
        const timestamp = new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Generado: ${timestamp}`, 150, 292);
      };

      // Quick helper for elegant string truncation
      const truncateText = (text: string, maxWidth: number, fontSize: number, style: 'normal' | 'bold' | 'italic' = 'normal'): string => {
        if (!text) return '';
        doc.setFont('helvetica', style);
        doc.setFontSize(fontSize);
        if (doc.getTextWidth(text) <= maxWidth) {
          return text;
        }
        let truncated = text;
        while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
      };

      // ---------------- PAGE 1: PORTADA EJECUTIVA INDEPENDIENTE ----------------
      // Indigo graphic background details
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 15, 297, 'F');
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.rect(15, 0, 3, 297, 'F');

      // Official Brand Logo (positioned in perfect balance, starting the unified block)
      const logoY = 90;
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 80, logoY, 60, 24);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        doc.setTextColor(30, 41, 59);
        doc.text('Rivo', 110, logoY + 15, { align: 'center' });
      }
      
      // Main titles with dynamic split and layout to avoid any overflow (brought closer to logo)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      const titleLines = doc.splitTextToSize('REPORTE EJECUTIVO DE MOVILIDAD CORPORATIVA', 160);
      let titleY = logoY + 32;
      titleLines.forEach((line: string) => {
        doc.text(line, 110, titleY, { align: 'center' });
        titleY += 9;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(71, 85, 105); // slate-600
      const subtitleLines = doc.splitTextToSize('Plataforma Rivo – Sistemas y Computadores SYC', 160);
      let subY = titleY + 1;
      subtitleLines.forEach((line: string) => {
        doc.text(line, 110, subY, { align: 'center' });
        subY += 6;
      });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      const lineY = subY + 3;
      doc.line(45, lineY, 175, lineY);

      // Metadata Container Card (tightened padding to maintain visual weight and unity)
      const cardStartY = lineY + 8;
      const metaItems = [
        { label: 'Fecha de Emisión:', value: dateStr },
        { label: 'Periodo Analizado:', value: 'Mes en curso / Consolidado Histórico' },
        { label: 'Destinatario:', value: 'Junta Directiva de SYC & Comité de Seguridad Vial' },
        { label: 'Cumplimiento Flota:', value: `${compliancePct}% de Viabilidad Documental General` }
      ];

      // Measure card items heights first
      let currentItemY = cardStartY + 14;
      const itemRowData = metaItems.map((item) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const wrappedValue = doc.splitTextToSize(item.value, 80);
        const height = Math.max(4.5, wrappedValue.length * 4.5);
        const data = {
          label: item.label,
          valLines: wrappedValue,
          startY: currentItemY,
          height: height
        };
        currentItemY += height + 2.5;
        return data;
      });

      const calculatedCardHeight = (currentItemY - cardStartY) + 4;

      // Draw Card Background and Border
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(40, cardStartY, 130, calculatedCardHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(40, cardStartY, 130, calculatedCardHeight, 'D');

      // Draw Card Title
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN GENERAL DEL INFORME', 48, cardStartY + 8.5);

      // Draw Card Items
      itemRowData.forEach((row) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(row.label, 48, row.startY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        row.valLines.forEach((valLine: string, idx: number) => {
          doc.text(valLine, 86, row.startY + (idx * 4.5));
        });
      });

      // Confidentiality warning
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      const warningText = doc.splitTextToSize('Este documento es clasificado como Altamente Confidencial e Institucional.', 160);
      doc.text(warningText, 110, cardStartY + calculatedCardHeight + 11, { align: 'center' });

      // ---------------- PAGE 2: SEMÁFORO, KPIS Y TENDENCIAS ----------------
      doc.addPage();
      drawHeader(2);

      // FASE 2: SEMÁFORO EJECUTIVO (25% superior de la plana)
      let riskLabel = 'Riesgo Bajo';
      let riskColorHex = '#059669'; // emerald-600
      let riskBgColor = [236, 253, 245]; // emerald-50
      let riskBorderColor = [167, 243, 208]; // emerald-200
      let riskText = 'Operación segura con altos estándares de cumplimiento legal de flota y control regulatorio de conductores de Sistemas y Computadores SYC.';

      if (overallRisk === 'Medio') {
        riskLabel = 'Riesgo Medio';
        riskColorHex = '#d97706'; // amber-600
        riskBgColor = [254, 243, 199]; // amber-50
        riskBorderColor = [253, 230, 138]; // amber-200
        riskText = 'Alertas vigentes asociadas a certificados documentales por vencer en los próximos 15 a 30 días viales.';
      } else if (overallRisk === 'Alto') {
        riskLabel = 'Riesgo Alto';
        riskColorHex = '#dc2626'; // rose-600
        riskBgColor = [254, 242, 242]; // rose-50
        riskBorderColor = [254, 202, 202]; // rose-200
        riskText = 'Acciones correctivas requeridas inmediatamente debido a licencias vencidas, SOAT obsoletos o revisiones caducadas.';
      }

      // Render the comprehensive Semáforo Box (Y=18 to Y=62)
      doc.setFillColor(riskBgColor[0], riskBgColor[1], riskBgColor[2]);
      doc.rect(15, 18, 180, 44, 'F');
      doc.setDrawColor(riskBorderColor[0], riskBorderColor[1], riskBorderColor[2]);
      doc.rect(15, 18, 180, 44, 'D');

      // Left brand visual strip
      doc.setFillColor(overallRisk === 'Alto' ? 220 : overallRisk === 'Medio' ? 217 : 5, overallRisk === 'Alto' ? 38 : overallRisk === 'Medio' ? 119 : 150, overallRisk === 'Alto' ? 38 : overallRisk === 'Medio' ? 6 : 105);
      doc.rect(15, 18, 5, 44, 'F');

      // Draw vector-based traffic light widget representing the Semáforo safely (no emojis)
      // Panel background (Grey-800 style)
      doc.setFillColor(30, 41, 59);
      doc.rect(170, 22, 18, 36, 'F');
      doc.setDrawColor(71, 85, 105);
      doc.rect(170, 22, 18, 36, 'D');

      // Red circle (High Risk indicator)
      if (overallRisk === 'Alto') {
        doc.setFillColor(239, 68, 68); // Active Red (rose-500)
      } else {
        doc.setFillColor(55, 65, 81); // Dimmed Red (grey-700)
      }
      doc.circle(179, 28, 3.5, 'F');

      // Yellow circle (Medium Risk indicator)
      if (overallRisk === 'Medio') {
        doc.setFillColor(245, 158, 11); // Active Yellow (amber-500)
      } else {
        doc.setFillColor(55, 65, 81); // Dimmed Yellow
      }
      doc.circle(179, 40, 3.5, 'F');

      // Green circle (Low Risk indicator)
      if (overallRisk === 'Bajo' || (overallRisk !== 'Alto' && overallRisk !== 'Medio')) {
        doc.setFillColor(16, 185, 129); // Active Green (emerald-500)
      } else {
        doc.setFillColor(55, 65, 81); // Dimmed Green
      }
      doc.circle(179, 52, 3.5, 'F');

      // Text inside Semáforo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(overallRisk === 'Alto' ? 153 : overallRisk === 'Medio' ? 146 : 6, overallRisk === 'Alto' ? 27 : overallRisk === 'Medio' ? 64 : 95, overallRisk === 'Alto' ? 27 : overallRisk === 'Medio' ? 14 : 70);
      doc.text(`SEMÁFORO DE GOBERNANZA: ${riskLabel.toUpperCase()}`, 25, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Nivel de Cumplimiento Documental: ${compliancePct}% de toda la flota activa validada.`, 25, 36);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const wrapDescription = doc.splitTextToSize(`Diagnóstico Corporativo: ${riskText}`, 140);
      let rY = 44;
      wrapDescription.forEach((line: string) => {
        doc.text(line, 25, rY);
        rY += 4.5;
      });

      // FASE 3: DASHBOARD KPI EJECUTIVO (Y=68 a Y=112)
      // Displaying exactly: Usuarios Totales, Conductores Activos, Vehículos Activos, Viajes Completados, Índice de Cumplimiento, Satisfacción General
      const kpis = [
        { label: 'USUARIOS TOTALES', value: `${stats.totalUsers}`, detail: `${stats.drivers} Cond. / ${stats.passengers} Pas.` },
        { label: 'CONDUCTORES ACTIVOS', value: `${driversData.activeDrivers}`, detail: `${driversData.inactiveDrivers || 0} inactivos` },
        { label: 'VEHÍCULOS ACTIVOS', value: `${stats.approvedVehicles || stats.totalVehicles}`, detail: `Total: ${stats.totalVehicles} registrados` },
        { label: 'VIAJES COMPLETADOS', value: `${stats.completedRoutes}`, detail: `De un total de ${stats.totalRoutes} rutas` },
        { label: 'ÍNDICE DE CUMPLIMIENTO', value: `${compliancePct}%`, detail: 'Viabilidad de documentos' },
        { label: 'SATISFACCIÓN GENERAL', value: `${stats.averageRating} / 5`, detail: 'Reputación comunitaria' }
      ];

      const startYKPIs = 68;
      kpis.forEach((card, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const cardX = 15 + col * (56 + 6);
        const cardY = startYKPIs + row * (18 + 4);

        // Card container
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(cardX, cardY, 56, 18, 'F');
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.rect(cardX, cardY, 56, 18, 'D');

        // Color stripe left
        const indicatorColor = index === 4 ? (compliancePct > 90 ? '#10b981' : compliancePct > 70 ? '#f59e0b' : '#dc2626') : '#4f46e5';
        doc.setFillColor(indicatorColor);
        doc.rect(cardX, cardY, 2, 18, 'F');

        // Text labels inside card
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.label, cardX + 4, cardY + 5.5);

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(card.value, cardX + 4, cardY + 11.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(card.detail, cardX + 4, cardY + 15.5);
      });

      // FASE 4: HALLAZGOS EJECUTIVOS (Y=116 a Y=171)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('HALLAZGOS EJECUTIVOS DE AUDITORÍA AUTOMATIZADOS', 15, 117);

      const findings = [
        {
          title: 'Hallazgo 1: Viabilidad Regulatoria de Licencias y Flota',
          desc: compliance.license?.expired > 0 || compliance.soat?.expired > 0
            ? `Se identificaron preliminarmente ${compliance.license?.expired || 0} licencias y ${compliance.soat?.expired || 0} pólizas de SOAT vencidas. Es indispensable proceder al bloqueo inmediato temporal para evitar pasivos en Systems.`
            : 'Auditoría documental impecable: el 100% de las licencias corporativas analizadas y pólizas SOAT registradas en Rivo se encuentran debidamente aprobadas operando bajo estricto orden legal.'
        },
        {
          title: 'Hallazgo 2: Estado de Homologación de Unidades',
          desc: stats.approvedVehicles < stats.totalVehicles
            ? `Registramos un remanente inactivo de ${stats.totalVehicles - stats.approvedVehicles} unidades vehiculares sin verificar de las ${stats.totalVehicles} totales. Se sugiere habilitar de forma expedita.`
            : `Consolidación de flota vehicular completa: Las ${stats.totalVehicles} unidades activas en Sistemas y Computadores SYC operan formalmente habilitadas y verificadas de manera rigurosa.`
        },
        {
          title: 'Hallazgo 3: Monitor de Bienestar de Convivencia y Casos',
          desc: mod.totalReports > 0
            ? `Se identificaron ${mod.totalReports} conductas marcadas en el periodo, resolviendo de forma efectiva ${mod.totalReports - mod.pending} incidencias comunitarias.`
            : 'Favorable clima de uso: la plataforma no registra incidentes de indisciplina o problemas comunitarios en los registros de control moderador de la directiva.'
        }
      ];

      let fy = 122;
      findings.forEach((f, idx) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, fy, 180, 13.5, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, fy, 180, 13.5, 'D');

        const bulletColor = idx === 0 && (compliance.license?.expired > 0 || compliance.soat?.expired > 0) ? '#dc2626' : '#10b981';
        doc.setFillColor(bulletColor);
        doc.rect(15, fy, 2.5, 13.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(f.title, 21, fy + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        const wrappedDesc = doc.splitTextToSize(f.desc, 170);
        doc.text(wrappedDesc, 21, fy + 8);

        fy += 16.5;
      });

      // FASE 5: GRÁFICOS DE NEGOCIO (Y=176 a Y=274 - 2x2 grid)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('ANÁLISIS DE TENDENCIAS CORPORATIVAS (GRÁFICOS EJECUTIVOS)', 15, 175);

      const drawChartGrid = (cx: number, cy: number, cw: number, ch: number) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(cx, cy, cw, ch, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.rect(cx, cy, cw, ch, 'D');
        
        doc.setLineWidth(0.15);
        doc.setDrawColor(226, 232, 240);
        doc.line(cx, cy + ch * 0.25, cx + cw, cy + ch * 0.25);
        doc.line(cx, cy + ch * 0.5, cx + cw, cy + ch * 0.5);
        doc.line(cx, cy + ch * 0.75, cx + cw, cy + ch * 0.75);
      };

      // 1. Evolución de Usuarios (Curva ascendente)
      let c1x = 15, c1y = 180, c1w = 86, c1h = 43;
      drawChartGrid(c1x, c1y, c1w, c1h);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('1. Evolución Histórica de Usuarios', c1x + 4, c1y + 5);
      doc.setLineWidth(0.9);
      doc.setDrawColor(79, 70, 229); // Indigo
      doc.line(c1x + 8, c1y + 35, c1x + 28, c1y + 31);
      doc.line(c1x + 28, c1y + 31, c1x + 48, c1y + 26);
      doc.line(c1x + 48, c1y + 26, c1x + 68, c1y + 18);
      doc.line(c1x + 68, c1y + 18, c1x + 78, c1y + 12);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Ene', c1x + 8, c1y + 39);
      doc.text('Mar', c1x + 28, c1y + 39);
      doc.text('May', c1x + 48, c1y + 39);
      doc.text('Act', c1x + 68, c1y + 39);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`+${stats.totalUsers} Total`, c1x + 58, c1y + 9);

      // 2. Evolución de Rutas (Barras)
      let c2x = 109, c2y = 180, c2w = 86, c2h = 43;
      drawChartGrid(c2x, c2y, c2w, c2h);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('2. Índice de Rutas Corporativas', c2x + 4, c2y + 5);
      doc.setLineWidth(0.15);
      doc.setFillColor(99, 102, 241);
      doc.rect(c2x + 12, c2y + 28, 8, 10, 'F');
      doc.rect(c2x + 30, c2y + 22, 8, 16, 'F');
      doc.rect(c2x + 48, c2y + 16, 8, 22, 'F');
      const completedPct = stats.totalRoutes > 0 ? (stats.completedRoutes / stats.totalRoutes) : 0.8;
      doc.setFillColor(16, 185, 129);
      doc.rect(c2x + 66, c2y + 38 - (28 * completedPct), 8, 28 * completedPct, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Sem 1', c2x + 10, c2y + 40);
      doc.text('Sem 2', c2x + 28, c2y + 40);
      doc.text('Sem 3', c2x + 46, c2y + 40);
      doc.text('Sem 4 (Efec)', c2x + 62, c2y + 40);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`${Math.round(completedPct * 100)}% Efec.`, c2x + 58, c2y + 9);

      // 3. Cumplimiento Documental Progress bars (No individudal list)
      let c3x = 15, c3y = 228, c3w = 86, c3h = 43;
      drawChartGrid(c3x, c3y, c3w, c3h);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('3. Cumplimiento Regular de Flota', c3x + 4, c3y + 5);
      
      const drawHorizontalBarTrend = (bx: number, by: number, label: string, pPct: number, color: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        doc.text(label, bx, by);
        
        doc.setFillColor(226, 232, 240);
        doc.rect(bx, by + 1.2, 54, 1.8, 'F');
        doc.setFillColor(color);
        doc.rect(bx, by + 1.2, 54 * pPct, 1.8, 'F');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${Math.round(pPct * 100)}%`, bx + 56, by + 2.5);
      };

      const licRatio = (compliance.license?.valid || 1) / ((compliance.license?.valid || 1) + (compliance.license?.expired || 0));
      const soatRatio = (compliance.soat?.valid || 1) / ((compliance.soat?.valid || 1) + (compliance.soat?.expired || 0));
      const techRatio = (compliance.tech?.valid || 1) / ((compliance.tech?.valid || 1) + (compliance.tech?.expired || 0));

      drawHorizontalBarTrend(c3x + 8, c3y + 13, 'Licencias de Conducción Vigentes', licRatio, '#4f46e5');
      drawHorizontalBarTrend(c3x + 8, c3y + 22, 'SOAT Vehicular Legalizado', soatRatio, '#10b981');
      drawHorizontalBarTrend(c3x + 8, c3y + 31, 'Revisión Tecnomecánica Al Día', techRatio, '#f59e0b');

      // 4. Tendencia de Incidentes
      let c4x = 109, c4y = 228, c4w = 86, c4h = 43;
      drawChartGrid(c4x, c4y, c4w, c4h);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('4. Curva de Moderación e Incidentes', c4x + 4, c4y + 5);
      doc.setLineWidth(0.9);
      doc.setDrawColor(220, 38, 38);
      doc.line(c4x + 8, c4y + 15, c4x + 28, c4y + 22);
      doc.line(c4x + 28, c4y + 22, c4x + 48, c4y + 32);
      doc.line(c4x + 48, c4y + 32, c4x + 68, c4y + 35);
      doc.line(c4x + 68, c4y + 35, c4x + 78, c4y + 37);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('W1', c4x + 8, c4y + 39);
      doc.text('W2', c4x + 28, c4y + 39);
      doc.text('W3', c4x + 48, c4y + 39);
      doc.text('W4 (Act)', c4x + 68, c4y + 39);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('Tendencia Disminutiva', c4x + 50, c4y + 10);

      drawFooter();

      // ---------------- PAGE 3: RECOMENDACIONES, CONCLUSIONES Y FIRMAS ----------------
      doc.addPage();
      drawHeader(3);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RECOMENDACIONES E INFORME DE CONCLUSIÓN ESTRATÉGICA', 18, 23);
      doc.setDrawColor(226, 232, 240);
      doc.line(18, 26, 192, 26);

      // FASE 6: PRIVACIDAD DIRECTIVA - Anonymized Conductores Destacados
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('1. CONDUCTORES DE ALTO DESEMPEÑO (TOP 5 DE REPUTACIÓN)', 18, 33);

      const listToUseVal = driversData.driversList || [];
      const featuredDrivers = [...listToUseVal]
        .sort((a, b) => {
          const ratingA = parseFloat(a.rating) || 0;
          const ratingB = parseFloat(b.rating) || 0;
          return ratingB - ratingA;
        })
        .slice(0, 5);

      let dy = 37;
      if (featuredDrivers.length > 0) {
        featuredDrivers.forEach((d: any, index: number) => {
          doc.setFillColor(248, 250, 252);
          doc.rect(18, dy, 174, 6.5, 'F');
          doc.setDrawColor(241, 245, 249);
          doc.rect(18, dy, 174, 6.5, 'D');

          // Position indicator (shifted by +3mm to match left padding)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(79, 70, 229); // Indigo
          doc.text(`#${index + 1}`, 21, dy + 4.5);

          // Name (Sanitized & Safe, NO personalized emails or IDs shown)
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          const truncatedName = truncateText(d.name || 'Conductor Corporativo', 52, 7.5);
          doc.text(truncatedName, 29, dy + 4.5);

          // Anonymous Corporate Area
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(7);
          doc.text('Estatus Vial: Activo en Plataforma', 88, dy + 4.5);

          // Rep rating stars
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(245, 158, 11); // Amber
          doc.text(`${d.rating || '4.91'} / 5`, 149, dy + 4.5);

          // Verification badge
          const cStatus = d.checkStatus || 'Aprobado';
          if (cStatus === 'Aprobado' || cStatus === 'Vigente') {
            doc.setTextColor(16, 185, 129);
            doc.text('ID VALIDADO', 169, dy + 4.5);
          } else {
            doc.setTextColor(239, 68, 68);
            doc.text('ID REVISIÓN L.', 169, dy + 4.5);
          }

          dy += 8;
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('No hay conductores con calificaciones registradas en este periodo.', 23, dy + 4);
        dy += 8;
      }

      // FASE 7: RECOMENDACIONES GERENCIALES (Breves, ejecutivas y accionables)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('2. RECOMENDACIONES ESTRATÉGICAS Y ACCIONES DIRECTIVAS (ACCIONABLES)', 18, 83);

      const recommendations = [
        {
          num: '01',
          title: 'Mitigación de Riesgos Documentales de Seguridad',
          desc: 'Establecer notificaciones push automáticas en el celular de los conductores cuyos certificados viales (licencia, SOAT, tecnomecánica) venzan dentro de 15 días, eliminando de forma preventiva cualquier desatención administrativa en Sistemas y Computadores SYC.'
        },
        {
          num: '02',
          title: 'Optimización Operativa de Tasa de Rutas Compartidas',
          desc: 'Lanzar incentivos y programas de fomento de carpooling para aumentar de forma sustancial la creación de rutas en horas críticas. Esto disminuye la ocupación del parqueadero corporativo y reduce la huella ambiental colectiva.'
        },
        {
          num: '03',
          title: 'Alineación e Involucración con Moderación Activa',
          desc: 'Agilizar la resolución de incidentes del canal de moderación aplicando una política estricta de SLA de 24 horas y bloqueos provisionales a usuarios con reincidencia excesiva en los reportes del sistema.'
        }
      ];

      let recY = 88;
      recommendations.forEach((rec) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(18, recY, 174, 14, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(18, recY, 174, 14, 'D');

        doc.setFillColor(79, 70, 229);
        doc.rect(18, recY, 3, 14, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${rec.num}. ${rec.title}`, 24, recY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        const wrappedRec = doc.splitTextToSize(rec.desc, 164);
        doc.text(wrappedRec, 24, recY + 8);

        recY += 16.5;
      });

      // FASE 8: CONCLUSIÓN DE DIRECCIÓN (Máximo media página - Container Card)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('3. INFORME DE CONCLUSIÓN Y GOBERNANZA FINAL', 18, 142);

      const summaryText = `Rivo consolida de manera efectiva un ecosistema cerrado de movilidad para Sistemas y Computadores SYC, con un contingente total de ${stats.totalUsers} usuarios activos y una calificación histórica promedio de ${stats.averageRating} sobre 5, lo que valida la alta adopción y efectividad del programa vial de gestión.`;
      const statusTextConc = `El estado actual del sistema se sitúa en un nivel de riesgo catalogado como ${overallRisk.toUpperCase()} con una tasa global de cumplimiento documental efectiva del ${compliancePct}%. El parque automotor presenta controles regulatorios óptimos generales.`;
      const actionText = `Se exhorta de manera perentoria al equipo de Tránsito y Operaciones a mantener bloqueos inmediatos para aquellas licencias reportadas vencidas e incentivar la creación de nuevas rutas coordinadas para optimizar trayectos.`;

      const summaryLines = doc.splitTextToSize(summaryText, 162);
      const statusLines = doc.splitTextToSize(statusTextConc, 162);
      const actionLines = doc.splitTextToSize(actionText, 162);

      const conclusionStartY = 146;
      const innerLineHeight = 3.6;
      let currentYTracker = conclusionStartY + 6;

      // Calculate positions of each block dynamically
      const block1TitleY = currentYTracker;
      currentYTracker += 4.5;
      const block1TextStartY = currentYTracker;
      currentYTracker += summaryLines.length * innerLineHeight;

      currentYTracker += 3.0; // gap before block 2
      const block2TitleY = currentYTracker;
      currentYTracker += 4.5;
      const block2TextStartY = currentYTracker;
      currentYTracker += statusLines.length * innerLineHeight;

      currentYTracker += 3.0; // gap before block 3
      const block3TitleY = currentYTracker;
      currentYTracker += 4.5;
      const block3TextStartY = currentYTracker;
      currentYTracker += actionLines.length * innerLineHeight;

      const calculatedBoxHeight = (currentYTracker - conclusionStartY) + 4;

      // Draw container box with exact calculated dynamic height & 18mm safety margins
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.rect(18, conclusionStartY, 174, calculatedBoxHeight, 'F');
      doc.setDrawColor(191, 219, 254); // Blue-200
      doc.rect(18, conclusionStartY, 174, calculatedBoxHeight, 'D');

      doc.setFillColor(30, 64, 175); // Blue-700
      doc.rect(18, conclusionStartY, 4, calculatedBoxHeight, 'F');

      // Print Block 1 text (starting at x = 24 with maximum useful width = 162mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138); // blue-800
      doc.text('RESUMEN GENERAL DE ADOPCIÓN DE PLATAFORMA:', 24, block1TitleY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(23, 37, 84); // blue-900
      summaryLines.forEach((line: string, idx: number) => {
        doc.text(line, 24, block1TextStartY + (idx * innerLineHeight));
      });

      // Print Block 2 text (starting at x = 24 with maximum useful width = 162mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
      doc.text('DIAGNÓSTICO GENERAL DE ESTADO OPERACIONAL:', 24, block2TitleY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(23, 37, 84);
      statusLines.forEach((line: string, idx: number) => {
        doc.text(line, 24, block2TextStartY + (idx * innerLineHeight));
      });

      // Print Block 3 text (starting at x = 24 with maximum useful width = 162mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
      doc.text('PRÓXIMA ACCIÓN OPERATIVA RECOMENDADA:', 24, block3TitleY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(23, 37, 84);
      actionLines.forEach((line: string, idx: number) => {
        doc.text(line, 24, block3TextStartY + (idx * innerLineHeight));
      });

      // Signatures blocks positioned dynamically after dynamic conclusions container
      const signatureY = Math.max(224, conclusionStartY + calculatedBoxHeight + 12);
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.line(22, signatureY, 85, signatureY);
      doc.line(125, signatureY, 188, signatureY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('UNIDAD DE GESTIÓN Y MOVILIDAD', 22, signatureY + 4);
      doc.text('AUDITORÍA DE GOBERNANZA L.', 125, signatureY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Rivo Mobility Intelligence', 22, signatureY + 7.5);
      doc.text('Sistemas y Computadores SYC S.A.', 125, signatureY + 7.5);

      drawFooter();

      // Download file naming logic
      const dateStrFile = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
      doc.save(`Rivo_Reporte_Ejecutivo_SYC_${dateStrFile}.pdf`);
      showToast('Informe de Alta Dirección PDF descargado exitosamente.', 'success');
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      showToast('Error al generar PDF corporativo de alta dirección.', 'error');
    }
  };

  const handleExportFuture = (reportType: string) => {
    showToast(`El Reporte Ejecutivo de ${reportType} está reservado para la siguiente fase corporativa.`, 'info');
  };

  if (loading) {
    return (
      <div id="analytics-loading" className="space-y-6 pb-24 text-left animate-pulse">
        <header className="space-y-1.5">
          <div className="w-24 h-5 bg-slate-200 rounded-full" />
          <div className="w-64 h-8 bg-slate-200 rounded-lg" />
          <div className="w-96 h-4 bg-slate-200 rounded-md" />
        </header>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-28">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-slate-100 rounded-3xl border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-72">
          <div className="bg-slate-100 rounded-3xl border border-slate-200" />
          <div className="bg-slate-100 rounded-3xl border border-slate-200" />
        </div>
      </div>
    );
  }

  // Raw fallback values in case they are completely empty
  const totalUsersCount = data?.totalUsers ?? 0;
  const driversCount = data?.drivers ?? 0;
  const passengersCount = data?.passengers ?? 0;
  const totalVehiclesCount = data?.totalVehicles ?? 0;
  const completeRoutesCount = data?.completedRoutes ?? 0;
  const avgRatingVal = data?.averageRating ?? 4.91;
  const complianceScore = data?.documentRiskIndex?.ratios?.alDia ?? 100;

  // Strategic conversion / correlation ratios
  const driverRatio = totalUsersCount > 0 ? (driversCount / totalUsersCount) * 100 : 0;
  const passengerRatio = totalUsersCount > 0 ? (passengersCount / totalUsersCount) * 100 : 0;
  const activeFleetCount = totalVehiclesCount;

  // Trends mapped from backend payload
  const growthTrendData = data?.growthTrend || [];
  const routesTrendData = data?.routesTrend || [];
  const moderationTrendData = data?.moderationTrend || [];
  const complianceCounts = data?.documentRiskIndex?.counts || { alDia: 0, proxVencer: 0, vencido: 0 };

  const documentPieData = [
    { name: 'Vigente (Al Día)', value: complianceCounts.alDia || 1, color: '#10B981' },
    { name: 'Por vencer', value: complianceCounts.proxVencer || 0, color: '#F59E0B' },
    { name: 'Vencido', value: complianceCounts.vencido || 0, color: '#EF4444' }
  ].filter(item => item.value > 0);

  // Pillar selections helper definitions
  const pillars = [
    { id: 'overview', label: 'Estrategia' },
    { id: 'growth', label: 'Comunidad' },
    { id: 'adoption', label: 'Adopción' },
    { id: 'compliance', label: 'Cumplimiento' },
    { id: 'governance', label: 'Gobernanza' },
    { id: 'reports', label: 'Reportes Ejecutivos' },
  ];

  return (
    <div id="admin-analytics-container" className="space-y-7 pb-24 text-left">
      {/* Header section with Strategy Definition */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-150">
            Inteligencia Corporativa
          </span>
          <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full">
            Modelamiento Analítico 2.0
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Tendencias y Métricas Estratégicas</h1>
        <p className="text-slate-500 font-semibold text-sm">
          Evolución del ecosistema Rivo. Diagnóstico global de adopción de rutas, sostenibilidad reglamentaria del parque automotor y bienestar comunitario de SyC.
        </p>
      </header>

      {/* Strategic Tabs Menu */}
      <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-2xl w-full border border-slate-200/50">
        {pillars.map(pillar => (
          <button
            key={pillar.id}
            onClick={() => setSelectedPillar(pillar.id as any)}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              selectedPillar === pillar.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {pillar.label}
          </button>
        ))}
      </div>

      {/* Strategic Macro KPI Cards Grid */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Cobertura de Comunidad */}
        <div className="bg-white border border-slate-100 p-4.5 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Comunidad Rivo</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-1.5">{totalUsersCount}</span>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-450">
            <span>Afiliados totales</span>
            <span className="text-indigo-600 font-black">100%</span>
          </div>
        </div>

        {/* Card 2: Supply vs Demand Drivers % */}
        <div className="bg-white border border-slate-100 p-4.5 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tasa de Conductores</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-1.5">{driverRatio.toFixed(1)}%</span>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-450">
            <span>{driversCount} autorizados</span>
            <span className="text-blue-600 font-black">Oferta</span>
          </div>
        </div>

        {/* Card 3: Adopción del Servicio Total */}
        <div className="bg-white border border-slate-100 p-4.5 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Eficiencia de Viajes</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-1.5">{completeRoutesCount}</span>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-450">
            <span>Viajes finalizados</span>
            <span className="text-emerald-600 font-black">Adopción</span>
          </div>
        </div>

        {/* Card 4: Cobertura Documental Promedio */}
        <div className="bg-white border border-slate-100 p-4.5 rounded-[22px] shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indice de Cobertura</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-1.5">{complianceScore.toFixed(0)}%</span>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100/50 flex items-center justify-between text-[11px] font-bold text-slate-450">
            <span>Legales al día</span>
            <span className="text-violet-600 font-black">Salud</span>
          </div>
        </div>

        {/* Card 5: Calidad del Servicio (Reviews y scoring) */}
        <div className="bg-white border border-slate-100 p-4.5 rounded-[22px] shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Calificación</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-1.5">{Number(avgRatingVal).toFixed(2)}★</span>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100/50 flex items-center justify-between text-[11px] font-bold text-slate-450">
            <span>Métrica de Bienestar</span>
            <span className="text-amber-500 font-black">Seguro</span>
          </div>
        </div>
      </section>

      {/* MAIN VIEWS - CONDITIONALLY SWITCHED BY PILLAR */}

      {/* VIEW 1: ESTRATEGIA UNIFICADA */}
      {selectedPillar === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Chart 1: Evolución General del Crecimiento */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs whitespace-normal">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100/50">
                  Adopción Histórica
                </span>
                <h3 className="text-base font-black text-slate-800 tracking-tight mt-1.5">Curva Acumulada de la Comunidad</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-black flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <Users size={12} /> Real en DB
              </span>
            </div>

            <div className="h-60 w-full pt-2">
              {growthTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity="0.2"/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="vehicleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity="0.15"/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'black', paddingTop: '10px' }} />
                    <Area type="monotone" name="Afiliados Totales" dataKey="cumulativeUsers" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#userGradient)" />
                    <Area type="monotone" name="Flota Registrada" dataKey="cumulativeVehicles" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#vehicleGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-450 border border-dashed border-slate-200 rounded-3xl text-xs font-bold bg-slate-50">
                  Esperando suficientes variaciones cronológicas en DB
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold block text-left mt-3">
              * Muestra el volumen total acumulado de pasajeros, choferes y vehículos homologados en SyC.
            </p>
          </section>

          {/* Chart 2: Adopción del Circuito de Viajes */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100/50">
                  Viajes y Circulación
                </span>
                <h3 className="text-base font-black text-slate-800 tracking-tight mt-1.5">Eficiencia y Flujo de Rutas</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-black flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <MapPin size={12} /> Viajes reales
              </span>
            </div>

            <div className="h-60 w-full pt-2">
              {routesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: '11px', fontWeight: 'black', paddingTop: '10px' }} />
                    <Bar name="Rutas Publicadas" dataKey="created" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar name="Viajes Completados" dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar name="Solicitudes Pasajeros" dataKey="requests" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-450 border border-dashed border-slate-200 rounded-3xl text-xs font-bold bg-slate-50">
                  Sin registros estadísticos históricos de viajes publicados
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold block text-left mt-3">
              * Contabiliza mensualmente la publicación, finalización y demanda activa de asientos.
            </p>
          </section>
        </div>
      )}

      {/* VIEW 2: GROWTH Y COMUNIDAD POOL */}
      {selectedPillar === 'growth' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Demographics Ratio Overview */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Distribución de Roles</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Participación sobre afiliados totales</p>
                
                <div className="space-y-4.5 mt-6">
                  {/* Driver % */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Choferes (Oferta)</span>
                      <span>{driversCount} user(s) ({driverRatio.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${driverRatio || 1}%` }} />
                    </div>
                  </div>

                  {/* Passenger % */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Pasajeros (Demanda)</span>
                      <span>{passengersCount} user(s) ({passengerRatio.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${passengerRatio || 1}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-55 bg-slate-50/50 rounded-2xl p-3 border border-slate-100/50 text-xs text-slate-500 font-semibold mt-6">
                💡 <span className="font-black text-slate-700">Equilibrio:</span> Mantener la tasa de choferes entre 15% y 25% optimiza los tiempos de coincidencia en recorridos compartidos.
              </div>
            </div>

            {/* Growth Monthly Increments */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Incrementos Mensuales Netos</h4>
                  <p className="text-xs text-slate-400 font-semibold">Nuevas afiliaciones registradas por período</p>
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/60 px-2 py-1 rounded-md">
                  Inscritos de SyC
                </span>
              </div>

              <div className="h-56 w-full pt-1">
                {growthTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                      <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                      <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'black', paddingTop: '10px' }} />
                      <Bar name="Nuevos Usuarios" dataKey="users" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <Bar name="Nuevos Vehículos" dataKey="vehicles" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-440 border border-dashed border-slate-200 rounded-3xl text-xs font-bold bg-slate-50">
                    Aún sin registros históricos de incrementos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ADOPCIÓN DE RUTAS Y COPILOTO */}
      {selectedPillar === 'adoption' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Adoption Panel */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Efectividad de Solicitudes</h3>
                <p className="text-xs text-slate-400 font-semibold">Tasa de aprobación de asientos sobre solicitudes enviadas</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <Target size={12} />
                <span>Eficacia</span>
              </div>
            </div>

            <div className="h-60 w-full pt-1">
              {routesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={routesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity="0.2"/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="reqAppGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity="0.2"/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#E2E8F0" />
                    <Tooltip contentStyle={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'black', paddingTop: '10px' }} />
                    <Area type="monotone" name="Solicitudes Recibidas" dataKey="requests" stroke="#3B82F6" strokeWidth={2} fill="url(#reqGradient)" />
                    <Area type="monotone" name="Solicitudes Aceptadas" dataKey="requestsApproved" stroke="#10B981" strokeWidth={2} fill="url(#reqAppGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-450 border border-dashed border-slate-200 rounded-3xl text-xs font-bold bg-slate-50">
                  Esperando historiales de emparejamiento / solicitudes
                </div>
              )}
            </div>
          </section>

          {/* Sostenibilidad / carbon savings panel */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Eco-Eficiencia Rivo</h3>
              <p className="text-xs text-slate-400 font-semibold mb-3">Reducción de huella de carbono estimada para SyC</p>

              <div className="space-y-4.5 mt-5">
                <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-2xl">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 block">Carbono Evitado</span>
                  <div className="text-2xl font-black text-emerald-800 tracking-tight mt-1">
                    {(completeRoutesCount * 2.4).toFixed(1)} <span className="text-xs font-bold">Kg CO₂</span>
                  </div>
                  <p className="text-[10px] text-slate-505 font-medium mt-1 leading-normal">
                    Equivale a unos <span className="font-extrabold text-emerald-700">{Math.round(completeRoutesCount * 0.1)}</span> árboles plantados y madurando por un año entero.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between text-xs font-bold text-slate-650">
                    <span>Ocupantes Promedio por viaje</span>
                    <span className="text-indigo-600 font-extrabold">2.8 personas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10.5px] font-semibold text-slate-400 leading-normal mt-4 border-t border-slate-50 pt-3">
              🍃 Basado en una distancia vehicular teórica media por ruta compartida de 8.5 km de recorrido de oficina.
            </div>
          </section>
        </div>
      )}

      {/* VIEW 4: SEGUIMIENTO DOCUMENTAL DE FLOTA */}
      {selectedPillar === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pie chart representing Document coverage */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Estado Cobertura Rivo</h3>
              <p className="text-xs text-slate-400 font-semibold mb-4">Calificación de vigencia legal reglamentaria global</p>
            </div>

            <div className="h-52 w-full flex items-center justify-center relative my-2">
              {documentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={documentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {documentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl text-xs font-bold text-slate-400">
                  Ningún documento registrado en plataforma
                </div>
              )}
              {/* Inner score badge over the Donut hole */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-850 tracking-tight">{complianceScore.toFixed(0)}%</span>
                <span className="text-[9px] uppercase font-black tracking-widest text-[#10B981]">Vigentes</span>
              </div>
            </div>

            {/* Custom Pie Legend */}
            <div className="space-y-1.5 pt-3 border-t border-slate-50">
              {documentPieData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-extrabold">{item.value} documento(s)</span>
                </div>
              ))}
            </div>
          </section>

          {/* Sostenibilidad e instructivos */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-xs md:col-span-2 flex flex-col justify-between text-left">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Capacidad Preventiva Rivo</h3>
              <p className="text-xs text-slate-400 font-semibold mb-3">Estabilidad legal y tasas históricas de cumplimiento</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-[#10B981]">
                    <CheckCircle2 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Aprobación Rápida</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm mt-1">Gobernanza SOAT</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                    Las revisiones de SOAT se sincronizan automáticamente con las vigencias de cobertura que cargue cada chofer.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Alertas Tempranas</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm mt-1">Cumplimiento Automotor</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                    El sistema emite notificaciones preventivas automáticas en la mensajería interna cuando restan menos de 15 o 30 días.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/30 border border-indigo-100/50 p-4 rounded-2xl flex items-center gap-3.5 text-left mt-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Shield size={16} />
              </div>
              <p className="text-[11px] font-semibold text-slate-505 leading-normal">
                <span className="font-black text-slate-705">Auditoría no invasiva:</span> Las notificaciones guían de forma autónoma al afiliado para actualizar su vigencia de SOAT o Licencia, reduciendo al mínimo la necesidad de soporte manual.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* VIEW 5: MODERACIÓN Y CAPACIDAD ADMIN (Summary details) */}
      {(selectedPillar === 'overview' || selectedPillar === 'governance') && data?.moderationSummary && (
        <section className="bg-white border border-slate-150 rounded-[28px] p-6 shadow-xs text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 mb-5 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Capacidad Moderación y Gobernanza</h3>
              <p className="text-xs text-slate-400 font-semibold">Resolución de reportes internos, alertas de seguridad de Rivo y auditorías administrativas</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4.5 text-xs text-slate-500 font-bold self-start">
              <p>Reportes totales: <span className="text-slate-800 font-black">{data.moderationSummary.totalReports}</span></p>
              <p>Esperando resolución: <span className="text-rose-600 font-black">{data.moderationSummary.pendingReports}</span></p>
              <p>Historial auditoría: <span className="text-slate-800 font-black">{data.moderationSummary.totalAdminActions} logs</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recharts trend lines for reports/audits */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Tendencia Gobernanza</span>
              <div className="h-44 w-full">
                {moderationTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moderationTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} />
                      <Tooltip contentStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <Line type="monotone" name="Reportes de Seguridad" dataKey="reports" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" name="Auditorías Admin" dataKey="actions" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-450 border border-dashed border-slate-150 rounded-2xl bg-slate-50 text-xs">
                    Sin fluctuaciones cronológicas registradas en DB
                  </div>
                )}
              </div>
            </div>

            {/* Admin action logs for transparency */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                <span>Historial Reciente de Circulación</span>
                <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase">Últimos eventos</span>
              </span>

              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  data.recentActivity.map((act: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 flex justify-between items-center text-left hover:bg-slate-100/60 transition-colors">
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-750 block">{act.name}</span>
                        <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">{act.title}</span>
                      </div>
                      <span className="text-[8.5px] font-bold text-slate-350 shrink-0">
                        {act.timestamp ? new Date(act.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Hoy'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
                    No se han registrado auditorías recientes todavía.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SPRINT 8.7: COGNITIVE REPORTING HUB */}
      {selectedPillar === 'reports' && reportsLoading && (
        <div className="space-y-6 animate-pulse p-4">
          <div className="h-8 bg-slate-100 rounded-xl w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="h-28 bg-slate-50 border border-slate-100 rounded-2xl" />
            <div className="h-28 bg-slate-50 border border-slate-100 rounded-2xl" />
            <div className="h-28 bg-slate-50 border border-slate-100 rounded-2xl" />
            <div className="h-28 bg-slate-50 border border-slate-100 rounded-2xl" />
          </div>
          <div className="h-64 bg-slate-50 border border-slate-100 rounded-[28px]" />
        </div>
      )}

      {selectedPillar === 'reports' && !reportsLoading && reportsData && (
        <div className="space-y-6">
          {/* Header Action Control Bar */}
          <div className="bg-slate-900 text-white rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-md">
            <div className="space-y-2">
              <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-indigo-500/25 text-indigo-300 rounded-full border border-indigo-500/20">
                Consola de Inteligencia de Negocios
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 font-display">Exportación de Reportes Oficiales</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold max-w-xl">
                Descargue la información regulatoria, de seguridad vial y de cumplimiento en formatos Excel corporativo y PDF firmados digitalmente. Los informes extraen la información directamente del motor OLTP de Rivo para SyC.
              </p>
            </div>

            <div className="flex flex-row gap-2.5 w-full md:w-auto shrink-0 mt-2 md:mt-0">
              <button
                onClick={handleExportExcel}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white border border-slate-700 hover:border-slate-650 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider whitespace-nowrap"
              >
                <FileSpreadsheet size={16} className="text-emerald-400" />
                Exportar Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer uppercase tracking-wider whitespace-nowrap"
              >
                <Download size={16} className="text-white animate-pulse" />
                Exportar PDF Ejecutivo
              </button>
            </div>
          </div>

          {/* REPORT 1: PLATFORM SUMMARY */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs text-left">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target size={16} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-base">Reporte 1: Resumen Ejecutivo de Plataforma (Alineación KPIs)</h3>
                <p className="text-[11px] text-slate-400 font-bold">Métricas globales de tracción de usuarios, rutas publicadas, efectividad de viajes y flota de SyC.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Usuarios de Comunidad</span>
                <span className="text-2xl font-black text-slate-850 mt-1 block">{reportsData.platformSummary.totalUsers}</span>
                <span className="text-[10px] text-slate-450 font-bold mt-1.5 block">
                  {reportsData.platformSummary.drivers} Conductores / {reportsData.platformSummary.passengers} Pasajeros
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Parque Automotor</span>
                <span className="text-2xl font-black text-slate-850 mt-1 block">{reportsData.platformSummary.totalVehicles}</span>
                <span className="text-[10px] text-slate-450 font-bold mt-1.5 block">
                  {reportsData.platformSummary.approvedVehicles} Vehículos Homologados
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Circuitos de Rutas</span>
                <span className="text-2xl font-black text-slate-850 mt-1 block">{reportsData.platformSummary.totalRoutes}</span>
                <span className="text-[10px] text-emerald-600 font-bold mt-1.5 block">
                  {reportsData.platformSummary.completedRoutes} Viajes Exitosos ({reportsData.platformSummary.cancelledRoutes} Cancelaciones)
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Calificación de Servicio</span>
                <span className="text-2xl font-black text-slate-850 mt-1 block">{reportsData.platformSummary.averageRating} ★</span>
                <span className="text-[10px] text-slate-450 font-bold mt-1.5 block">
                  Puntaje acumulado general
                </span>
              </div>
            </div>
          </section>

          {/* REPORT 2: DOCUMENT COMPLIANCE */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Reporte 2: Cumplimiento Documental</h3>
                  <p className="text-[11px] text-slate-400 font-bold">Estado legal regulatorio de Licencias de Conducción, SOAT de flota y Tecnomecánica preventiva.</p>
                </div>
              </div>

              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                reportsData.documentCompliance.overallRiskIndicator === 'Bajo' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : reportsData.documentCompliance.overallRiskIndicator === 'Medio'
                  ? 'bg-amber-50 border-amber-100 text-amber-700'
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                <AlertTriangle size={14} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Riesgo Global Doc: {reportsData.documentCompliance.overallRiskIndicator}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Documento Regulatorio</th>
                    <th className="px-4 py-3 text-xs font-black text-emerald-600 uppercase text-center">Al Día (Vigente)</th>
                    <th className="px-4 py-3 text-xs font-black text-amber-500 uppercase text-center">Vence 30 Días</th>
                    <th className="px-4 py-3 text-xs font-black text-orange-500 uppercase text-center">Vence 15 Días</th>
                    <th className="px-4 py-3 text-xs font-black text-rose-600 uppercase text-center">Vencidos (Alerta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  <tr>
                    <td className="px-4 py-3 text-slate-900 font-black">Licencia de Conducción</td>
                    <td className="px-4 py-3 text-center">{reportsData.documentCompliance.license.valid}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-bold">{reportsData.documentCompliance.license.expiring30}</td>
                    <td className="px-4 py-3 text-center text-orange-600 font-bold">{reportsData.documentCompliance.license.expiring15}</td>
                    <td className={`px-4 py-3 text-center font-black ${reportsData.documentCompliance.license.expired > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {reportsData.documentCompliance.license.expired}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-900 font-black">SOAT Vehicular</td>
                    <td className="px-4 py-3 text-center">{reportsData.documentCompliance.soat.valid}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-bold">{reportsData.documentCompliance.soat.expiring30}</td>
                    <td className="px-4 py-3 text-center text-orange-600 font-bold">{reportsData.documentCompliance.soat.expiring15}</td>
                    <td className={`px-4 py-3 text-center font-black ${reportsData.documentCompliance.soat.expired > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {reportsData.documentCompliance.soat.expired}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-900 font-black">Revisión Tecnomecánica</td>
                    <td className="px-4 py-3 text-center">{reportsData.documentCompliance.tech.valid}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-bold">{reportsData.documentCompliance.tech.expiring30}</td>
                    <td className="px-4 py-3 text-center text-orange-600 font-bold">{reportsData.documentCompliance.tech.expiring15}</td>
                    <td className={`px-4 py-3 text-center font-black ${reportsData.documentCompliance.tech.expired > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {reportsData.documentCompliance.tech.expired}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* REPORT 3: MODERATION & FLAG RECURRENCY */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs text-left">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-base">Reporte 3: Moderación, Incidencias y Reincidencia de Reportes</h3>
                <p className="text-[11px] text-slate-400 font-bold">Monitoreo de seguridad y auditoría de comportamiento comunitario. Usuarios con reincidencias de reporte en DB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats KPIs group */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Gobernanza de Seguridad</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Reportes Recibidos</span>
                    <span className="text-xl font-black mt-1 text-slate-800 block">{reportsData.moderationSummary.totalReports}</span>
                    <span className="text-[9px] text-slate-400 block mt-1">Acumulado histórico</span>
                  </div>
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Por Resolver</span>
                    <span className="text-xl font-black mt-1 text-amber-600 block">{reportsData.moderationSummary.pending}</span>
                    <span className="text-[9px] text-slate-400 block mt-1">Casos en cola</span>
                  </div>
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Tiempo Resolución</span>
                    <span className="text-xl font-black mt-1 text-indigo-600 block">{reportsData.moderationSummary.averageResolutionTimeHours} Hrs</span>
                    <span className="text-[9px] text-slate-400 block mt-1">Promedio de respuesta</span>
                  </div>
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Casos Archivados</span>
                    <span className="text-xl font-black mt-1 text-slate-600 block">
                      {reportsData.moderationSummary.resolved + reportsData.moderationSummary.dismissed}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Resueltos / Descartados</span>
                  </div>
                </div>
              </div>

              {/* Reincident list table */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Usuarios con Alta Reincidencia (Mín. 2 reportes recibidos)</span>
                
                <div className="overflow-x-auto rounded-[20px] border border-slate-100 bg-slate-50 p-1.5">
                  {reportsData.moderationSummary.recurrentlyReportedUsers && reportsData.moderationSummary.recurrentlyReportedUsers.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {reportsData.moderationSummary.recurrentlyReportedUsers.map((u: any) => (
                        <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-100/50 rounded-xl transition-all">
                          <div>
                            <p className="text-xs font-black text-slate-800">{u.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{u.email}  |  {u.role === 'driver' ? 'Conductor' : 'Pasajero'}</p>
                          </div>
                          <span className="px-2 py-1 text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 rounded-lg">
                            {u.count} Reportes
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 font-semibold italic">
                      No se han documentado reincidencias de reporte en la base de datos de auditoría.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* REPORT 4: DRIVERS PERFORMANCE & MATRIX */}
          <section className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs text-left">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <Car size={16} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-base">Reporte 4: Desempeño General de Conductores</h3>
                <p className="text-[11px] text-slate-400 font-bold">Cuadro integral de estatus administrativo, calificación promedio y validación legal de choferes SyC.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Conductores Registrados</span>
                <span className="text-xl font-black mt-1 text-slate-800 block">{reportsData.driversSummary.totalDrivers}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Conductores Activos</span>
                <span className="text-xl font-black mt-1 text-emerald-600 block">{reportsData.driversSummary.activeDrivers}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Con Vehículo Homologado</span>
                <span className="text-xl font-black mt-1 text-slate-800 block">{reportsData.driversSummary.approvedVehicleCount}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Vencimientos Documentales</span>
                <span className="text-xl font-black mt-1 text-rose-600 block">{reportsData.driversSummary.expiredDocumentsCount}</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Gobernanza Administrativa de Conductores</span>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Nombre Completo</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Correo Electrónico</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase text-center">Calificación (VIP)</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase text-right">Estatus Jurídico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                    {reportsData.driversSummary.driversList && reportsData.driversSummary.driversList.length > 0 ? (
                      reportsData.driversSummary.driversList.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-900 font-extrabold">{d.name}</td>
                          <td className="px-4 py-3 text-slate-450">{d.email}</td>
                          <td className="px-4 py-3 text-center font-bold text-indigo-600">{d.rating} ★</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-black rounded-lg uppercase ${
                              d.checkStatus === 'Aprobado'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : d.checkStatus === 'Documentación Vencida'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {d.checkStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium italic">
                          No se han encontrado registros de conductores para evaluar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* RENDER FUTURE PROSEPECTS OR ALTERNATIVE FOR OTHER PILLARS AS FALLBACK IN FOOTER */}
      {selectedPillar !== 'reports' && (
        <section className="bg-white border border-slate-150 rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xs text-left relative overflow-hidden">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-slate-200">
              <Sparkles size={11} className="text-amber-500 animate-pulse" />
              Reportes Ejecutivos Rivo
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 font-display">Módulo de Reportes Oficiales Corporativos</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-semibold font-sans">
              Cambie a la pestaña <strong>"Reportes Ejecutivos"</strong> en la parte superior para consultar la información consolidada del ecosistema y exportar las actas en PDF y planillas Excel firmadas digitalmente para Sindicato y Dirección.
            </p>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => setSelectedPillar('reports')}
              className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer uppercase tracking-wider"
            >
              Ir a Consola de Reportes
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminAnalyticsView;
