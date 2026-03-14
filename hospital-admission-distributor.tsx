import React, { useState } from 'react';
import { Plus, Trash2, Calculator, BarChart3, Users, Settings, BookOpen, AlertCircle, Download } from 'lucide-react';

const HospitalAdmissionTool = () => {
  const [activeTab, setActiveTab] = useState('setup');
  
  const floors = ['1S', '1C', '2S', '2C', '3S', '4S', '2NE', '2N', 'Floating'];
  
  // Algorithm parameters
  const CAP_PATIENTS = 17;
  const ALPHA = 0.685;

  // Rounder data
  const [rounders, setRounders] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Rounder ${i + 1}`,
      currentCensus: 0,
      floor: i < 7 ? floors[i] : 'Floating',
      isFloating: i >= 7
    }))
  );

  // Admissions data
  const [admissions, setAdmissions] = useState([]);
  
  // Distribution results
  const [distribution, setDistribution] = useState(null);

  const tabs = [
    { id: 'setup', label: 'Rounder Setup', icon: Settings },
    { id: 'admissions', label: 'New Admissions', icon: Plus },
    { id: 'calculator', label: 'Distribution', icon: Calculator },
    { id: 'assignments', label: 'Assignment Order', icon: Users },
    { id: 'sankey', label: 'Flow Chart', icon: BarChart3 },
    { id: 'legend', label: 'Algorithm Guide', icon: BookOpen }
  ];

  const updateRounder = (id, field, value) => {
    setRounders(rounders.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const updateRounderFloor = (id, floorValue) => {
    setRounders(rounders.map(r => 
      r.id === id ? { 
        ...r, 
        floor: floorValue,
        isFloating: floorValue === 'Floating'
      } : r
    ));
  };

  const addAdmission = () => {
    setAdmissions([...admissions, {
      id: Date.now(),
      admittedBy: 'non-rounder',
      floor: '1S',
      patientName: `Patient ${admissions.length + 1}`
    }]);
  };

  const removeAdmission = (id) => {
    setAdmissions(admissions.filter(a => a.id !== id));
  };

  const updateAdmission = (id, field, value) => {
    setAdmissions(admissions.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  // PDF Export function
  const downloadPDF = () => {
    window.print();
  };

  // Distribution algorithm with assignment order tracking
  const calculateDistribution = () => {
    const result = {
      assignments: {},
      summary: [],
      assignmentOrder: [], // NEW: Track order
      metrics: {
        geoMatches: 0,
        proportionalAssignments: 0,
        overflowAssignments: 0
      }
    };

    let assignmentCounter = 0; // NEW: Track sequential order

    // Initialize rounder states
    const rounderStates = rounders.map(r => {
      const capacity = Math.max(0, CAP_PATIENTS - r.currentCensus);
      const slack = capacity / CAP_PATIENTS;
      const weight = Math.pow(slack, ALPHA);
      const overage = Math.max(0, r.currentCensus - CAP_PATIENTS);
      
      return {
        ...r,
        capacity: capacity,
        slack: slack,
        weight: weight,
        overage: overage,
        assignedPatients: [],
        assignedCount: 0,
        quota: 0,
        remainingQuota: 0
      };
    });

    // Filter to only non-rounder admissions
    const poolAdmissions = admissions.filter(a => a.admittedBy === 'non-rounder');
    
    if (poolAdmissions.length === 0) {
      result.summary = rounderStates.map(r => ({
        rounderId: r.id,
        rounderName: r.name,
        floor: r.floor,
        startCensus: r.currentCensus,
        newAdmissions: 0,
        endCensus: r.currentCensus,
        slack: r.slack,
        overage: r.overage,
        hitCap: r.currentCensus >= CAP_PATIENTS,
        admissions: []
      }));
      setDistribution(result);
      return;
    }

    const N = poolAdmissions.length;
    const totalCapacity = rounderStates.reduce((sum, r) => sum + r.capacity, 0);
    
    // Check if overflow mode needed
    if (totalCapacity < N) {
      // Overflow mode: water-filling
      poolAdmissions.forEach(admission => {
        const sortedByOverage = [...rounderStates].sort((a, b) => {
          const aCurrentTotal = a.currentCensus + a.assignedCount;
          const bCurrentTotal = b.currentCensus + b.assignedCount;
          const aOver = Math.max(0, aCurrentTotal - CAP_PATIENTS);
          const bOver = Math.max(0, bCurrentTotal - CAP_PATIENTS);
          
          if (aOver !== bOver) return aOver - bOver;
          
          const aGeoMatch = !a.isFloating && a.floor === admission.floor ? 1 : 0;
          const bGeoMatch = !b.isFloating && b.floor === admission.floor ? 1 : 0;
          if (aGeoMatch !== bGeoMatch) return bGeoMatch - aGeoMatch;
          
          if (aCurrentTotal !== bCurrentTotal) return aCurrentTotal - bCurrentTotal;
          
          return a.id - b.id;
        });
        
        const targetRounder = sortedByOverage[0];
        targetRounder.assignedPatients.push({
          ...admission,
          reason: 'overflow_waterfill'
        });
        targetRounder.assignedCount++;
        result.metrics.overflowAssignments++;
        
        // NEW: Track assignment
        assignmentCounter++;
        result.assignmentOrder.push({
          order: assignmentCounter,
          patientId: admission.patientName,
          floor: admission.floor,
          assignedTo: targetRounder.name,
          assignedToId: targetRounder.id,
          assignedFloor: targetRounder.floor,
          reason: 'overflow_waterfill',
          reasonLabel: 'Overflow (Water-filling)'
        });
      });
    } else {
      // Normal mode: Calculate quotas
      const totalWeight = rounderStates.reduce((sum, r) => sum + r.weight, 0);
      
      rounderStates.forEach(r => {
        const rawQuota = totalWeight > 0 ? (r.weight / totalWeight) * N : 0;
        r.quota = Math.min(Math.floor(rawQuota), r.capacity);
        r.remainder = rawQuota - Math.floor(rawQuota);
        r.remainingQuota = r.quota;
      });
      
      // Distribute remainders
      let assigned = rounderStates.reduce((sum, r) => sum + r.quota, 0);
      let remaining = N - assigned;
      
      while (remaining > 0) {
        const eligible = rounderStates.filter(r => r.quota < r.capacity);
        if (eligible.length === 0) break;
        
        eligible.sort((a, b) => {
          if (b.remainder !== a.remainder) return b.remainder - a.remainder;
          if (a.currentCensus !== b.currentCensus) return a.currentCensus - b.currentCensus;
          if (b.weight !== a.weight) return b.weight - a.weight;
          return a.id - b.id;
        });
        
        eligible[0].quota++;
        eligible[0].remainingQuota++;
        eligible[0].remainder = 0;
        remaining--;
      }
      
      // Stage A: Home-floor first
      const unassignedPatients = [...poolAdmissions];
      const assignedIndices = new Set();
      
      const patientsByFloor = {};
      unassignedPatients.forEach((p, idx) => {
        if (!patientsByFloor[p.floor]) patientsByFloor[p.floor] = [];
        patientsByFloor[p.floor].push({ patient: p, index: idx });
      });
      
      Object.keys(patientsByFloor).forEach(floor => {
        const homeRounder = rounderStates.find(r => !r.isFloating && r.floor === floor);
        if (!homeRounder || homeRounder.remainingQuota === 0) return;
        
        const floorPatients = patientsByFloor[floor];
        const toAssign = Math.min(homeRounder.remainingQuota, floorPatients.length);
        
        for (let i = 0; i < toAssign; i++) {
          const { patient, index } = floorPatients[i];
          homeRounder.assignedPatients.push({
            ...patient,
            reason: 'geo_match_within_quota'
          });
          homeRounder.assignedCount++;
          homeRounder.remainingQuota--;
          assignedIndices.add(index);
          result.metrics.geoMatches++;
          
          // NEW: Track assignment
          assignmentCounter++;
          result.assignmentOrder.push({
            order: assignmentCounter,
            patientId: patient.patientName,
            floor: patient.floor,
            assignedTo: homeRounder.name,
            assignedToId: homeRounder.id,
            assignedFloor: homeRounder.floor,
            reason: 'geo_match_within_quota',
            reasonLabel: 'Geographic Match (Home Floor)'
          });
        }
      });
      
      // Stage B: Spillover
      unassignedPatients.forEach((patient, idx) => {
        if (assignedIndices.has(idx)) return;
        
        const eligible = rounderStates.filter(r => r.remainingQuota > 0);
        if (eligible.length === 0) return;
        
        eligible.sort((a, b) => {
          const aGeoMatch = !a.isFloating && a.floor === patient.floor ? 1 : 0;
          const bGeoMatch = !b.isFloating && b.floor === patient.floor ? 1 : 0;
          if (aGeoMatch !== bGeoMatch) return bGeoMatch - aGeoMatch;
          
          const aCensus = a.currentCensus + a.assignedCount;
          const bCensus = b.currentCensus + b.assignedCount;
          if (aCensus !== bCensus) return aCensus - bCensus;
          
          const aRatio = a.quota > 0 ? a.remainingQuota / a.quota : 0;
          const bRatio = b.quota > 0 ? b.remainingQuota / b.quota : 0;
          if (bRatio !== aRatio) return bRatio - aRatio;
          
          return a.id - b.id;
        });
        
        const targetRounder = eligible[0];
        const isGeoMatch = !targetRounder.isFloating && targetRounder.floor === patient.floor;
        
        targetRounder.assignedPatients.push({
          ...patient,
          reason: isGeoMatch ? 'geo_match_within_quota' : 'proportional_within_quota'
        });
        targetRounder.assignedCount++;
        targetRounder.remainingQuota--;
        
        if (isGeoMatch) {
          result.metrics.geoMatches++;
        } else {
          result.metrics.proportionalAssignments++;
        }
        
        // NEW: Track assignment
        assignmentCounter++;
        result.assignmentOrder.push({
          order: assignmentCounter,
          patientId: patient.patientName,
          floor: patient.floor,
          assignedTo: targetRounder.name,
          assignedToId: targetRounder.id,
          assignedFloor: targetRounder.floor,
          reason: isGeoMatch ? 'geo_match_within_quota' : 'proportional_within_quota',
          reasonLabel: isGeoMatch ? 'Geographic Match (Within Quota)' : 'Proportional (Quota-Based)'
        });
      });
    }

    // Create summary
    result.summary = rounderStates.map(r => {
      const finalCensus = r.currentCensus + r.assignedCount;
      const finalSlack = Math.max(0, CAP_PATIENTS - finalCensus) / CAP_PATIENTS;
      const finalOverage = Math.max(0, finalCensus - CAP_PATIENTS);
      
      return {
        rounderId: r.id,
        rounderName: r.name,
        floor: r.floor,
        startCensus: r.currentCensus,
        newAdmissions: r.assignedCount,
        endCensus: finalCensus,
        slack: finalSlack,
        overage: finalOverage,
        hitCap: finalCensus >= CAP_PATIENTS,
        admissions: r.assignedPatients
      };
    });

    result.assignments = rounderStates.reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});

    setDistribution(result);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Print Styles */}
      <style>{`
        @media print {
          body { 
            background: white !important; 
            margin: 0;
            padding: 20px;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          
          .bg-gray-900, .bg-gray-800, .bg-gray-700, .bg-gray-600 { 
            background: white !important; 
            color: black !important; 
          }
          .text-gray-100, .text-gray-200, .text-gray-300, .text-gray-400, .text-white { 
            color: black !important; 
          }
          .border-gray-700, .border-gray-600 { 
            border-color: #ccc !important; 
          }
          
          .bg-blue-600, .bg-green-600, .bg-purple-600, .bg-red-600, .bg-orange-600, 
          .bg-blue-700, .bg-green-700, .bg-purple-700 { 
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          .bg-green-600, .bg-green-700 { background: #16a34a !important; color: white !important; }
          .bg-purple-600, .bg-purple-700 { background: #9333ea !important; color: white !important; }
          .bg-orange-600 { background: #ea580c !important; color: white !important; }
          .bg-blue-700, .bg-blue-600 { background: #1d4ed8 !important; color: white !important; }
          
          .text-white, .text-blue-100, .text-green-100, .text-purple-100, .text-orange-100 {
            color: white !important;
          }
          
          h1, h2, h3 { color: black !important; }
          table { page-break-inside: avoid; }
          .flow-chart-item { page-break-inside: avoid; margin-bottom: 10px; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
            <Users className="w-7 h-7" />
            Belleville Memorial Hospital Admission Flowchart
          </h1>
          <p className="text-sm text-gray-400 mt-1">Weekend admission assignment tool • <span className="text-blue-300">by Akash Venkataramanan</span></p>
        </div>
      </div>

      {/* PHI Warning Banner */}
      <div className="bg-red-900/40 border-l-4 border-red-500 p-3 no-print">
        <div className="flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="text-sm">
            <strong className="text-red-300">PHI Warning:</strong>
            <span className="text-red-200 ml-2">
              Do not enter Protected Health Information (patient names, MRNs, room numbers, dates of birth). 
              Use generic identifiers only (e.g., "Patient 1", "Patient 2").
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 px-2 overflow-x-auto no-print">
        <div className="flex gap-1 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-gray-750'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-4">
            <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-400 mb-1">Important: Pre-Assignment Required</h3>
                  <p className="text-sm text-yellow-200">
                    <strong>Before using this calculator:</strong> Manually assign all patients who were admitted yesterday 
                    by today's rounders back to those same rounders. Include those in the "Current Census" below.
                  </p>
                  <p className="text-sm text-yellow-200 mt-2">
                    This tool only distributes <strong>swing shift and nocturnist admissions</strong> from yesterday.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">Rounder Configuration</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-left py-2 px-2">Current Census</th>
                      <th className="text-left py-2 px-2">Home Floor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounders.map(r => (
                      <tr key={r.id} className="border-b border-gray-700/50">
                        <td className="py-3 px-2 font-medium">#{r.id}</td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => updateRounder(r.id, 'name', e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-full max-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            value={r.currentCensus}
                            onChange={(e) => updateRounder(r.id, 'currentCensus', parseInt(e.target.value) || 0)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={r.floor}
                            onChange={(e) => updateRounderFloor(r.id, e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {floors.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded">
                <p className="text-sm text-blue-300">
                  <strong>Current Census:</strong> Total number of patients this rounder has at the start of the day, 
                  INCLUDING any patients they personally admitted yesterday (continuity already assigned).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admissions Tab */}
        {activeTab === 'admissions' && (
          <div className="space-y-4">
            <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-400 mb-1">Pool Definition</h3>
                  <p className="text-sm text-blue-200">
                    Only add patients admitted yesterday by <strong>swing shift or nocturnists</strong>. 
                    Patients admitted by rounders should already be assigned (see Setup tab).
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-400 mb-1">⚠️ PHI Protection Required</h3>
                  <p className="text-sm text-red-200">
                    <strong>Do NOT enter:</strong> Patient names, medical record numbers (MRNs), room numbers, dates of birth, 
                    or any other Protected Health Information. Use generic identifiers only (e.g., "Patient 1", "Patient A", "Admit #1").
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-400">Swing + Nocturnist Admissions Pool</h2>
                <button
                  onClick={addAdmission}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Admission
                </button>
              </div>

              {admissions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No admissions added yet</p>
                  <p className="text-sm mt-1">Click "Add Admission" to start</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2">Patient ID (No PHI)</th>
                        <th className="text-left py-2 px-2">Admitted By</th>
                        <th className="text-left py-2 px-2">Floor</th>
                        <th className="text-center py-2 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admissions.map(a => (
                        <tr key={a.id} className="border-b border-gray-700/50">
                          <td className="py-3 px-2">
                            <input
                              type="text"
                              value={a.patientName}
                              onChange={(e) => updateAdmission(a.id, 'patientName', e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 w-full max-w-[150px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <select
                              value={a.admittedBy}
                              onChange={(e) => updateAdmission(a.id, 'admittedBy', e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="non-rounder">Swing/Nocturnist</option>
                              {rounders.map(r => (
                                <option key={r.id} value={`rounder${r.id}`}>{r.name} (manual assign)</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-2">
                            <select
                              value={a.floor}
                              onChange={(e) => updateAdmission(a.id, 'floor', e.target.value)}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {floors.filter(f => f !== 'Floating').map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => removeAdmission(a.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded">
                <p className="text-sm text-green-300">
                  <strong>Total Pool Admissions:</strong> {admissions.filter(a => a.admittedBy === 'non-rounder').length} 
                  <span className="text-gray-400 ml-2">
                    (Only "Swing/Nocturnist" admissions will be distributed by the algorithm)
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">Distribution Calculator</h2>
              
              <button
                onClick={calculateDistribution}
                disabled={admissions.filter(a => a.admittedBy === 'non-rounder').length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Calculate Distribution
              </button>

              {distribution && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-green-400">Distribution Results</h3>
                  
                  {/* Metrics Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-600 p-4 rounded border-2 border-green-400">
                      <p className="text-xs text-green-100 mb-1 font-semibold">Geographic Matches</p>
                      <p className="text-3xl font-bold text-white">{distribution.metrics.geoMatches}</p>
                    </div>
                    <div className="bg-purple-600 p-4 rounded border-2 border-purple-400">
                      <p className="text-xs text-purple-100 mb-1 font-semibold">Proportional Assignments</p>
                      <p className="text-3xl font-bold text-white">{distribution.metrics.proportionalAssignments}</p>
                    </div>
                    <div className="bg-orange-600 p-4 rounded border-2 border-orange-400">
                      <p className="text-xs text-orange-100 mb-1 font-semibold">Overflow Assignments</p>
                      <p className="text-3xl font-bold text-white">{distribution.metrics.overflowAssignments}</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-2">Rounder</th>
                          <th className="text-left py-2 px-2">Floor</th>
                          <th className="text-center py-2 px-2">Start</th>
                          <th className="text-center py-2 px-2">+New</th>
                          <th className="text-center py-2 px-2">End</th>
                          <th className="text-center py-2 px-2">Status</th>
                          <th className="text-left py-2 px-2">Assigned Patients (No PHI)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distribution.summary.map(s => (
                          <tr key={s.rounderId} className="border-b border-gray-700/50">
                            <td className="py-3 px-2 font-medium">{s.rounderName}</td>
                            <td className="py-3 px-2 text-gray-400 text-xs">{s.floor}</td>
                            <td className="py-3 px-2 text-center">{s.startCensus}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="bg-green-700 text-green-100 px-2 py-1 rounded text-xs">
                                +{s.newAdmissions}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-bold">
                              <span className={s.hitCap ? 'text-red-400' : 'text-green-400'}>
                                {s.endCensus}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {s.hitCap ? (
                                <span className="text-xs bg-red-700 text-red-100 px-2 py-1 rounded">
                                  At Cap
                                </span>
                              ) : (
                                <span className="text-xs bg-green-700 text-green-100 px-2 py-1 rounded">
                                  {(s.slack * 100).toFixed(0)}% slack
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-xs">
                              {s.admissions.length > 0 ? (
                                <div className="space-y-1">
                                  {s.admissions.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="text-gray-300">{a.patientName}</span>
                                      <span className={`text-xs px-1 rounded ${
                                        a.reason === 'geo_match_within_quota' ? 'bg-green-700 text-green-200' :
                                        a.reason === 'proportional_within_quota' ? 'bg-purple-700 text-purple-200' :
                                        a.reason === 'overflow_waterfill' ? 'bg-orange-700 text-orange-200' :
                                        'bg-gray-700 text-gray-200'
                                      }`}>
                                        {a.reason === 'geo_match_within_quota' ? 'G' :
                                         a.reason === 'proportional_within_quota' ? 'P' :
                                         a.reason === 'overflow_waterfill' ? 'O' : '?'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500">None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-1">
                      <span className="bg-green-700 text-green-200 px-2 py-1 rounded">G</span>
                      <span className="text-gray-400">Geographic Match</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-purple-700 text-purple-200 px-2 py-1 rounded">P</span>
                      <span className="text-gray-400">Proportional</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-orange-700 text-orange-200 px-2 py-1 rounded">O</span>
                      <span className="text-gray-400">Overflow</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-blue-700 border-2 border-blue-500 p-4 rounded">
                      <p className="text-sm text-blue-100 font-semibold">Total Census Start</p>
                      <p className="text-2xl font-bold text-white">
                        {distribution.summary.reduce((sum, s) => sum + s.startCensus, 0)}
                      </p>
                    </div>
                    <div className="bg-green-700 border-2 border-green-500 p-4 rounded">
                      <p className="text-sm text-green-100 font-semibold">Pool Distributed</p>
                      <p className="text-2xl font-bold text-white">
                        {distribution.summary.reduce((sum, s) => sum + s.newAdmissions, 0)}
                      </p>
                    </div>
                    <div className="bg-purple-700 border-2 border-purple-500 p-4 rounded">
                      <p className="text-sm text-purple-100 font-semibold">Total Census End</p>
                      <p className="text-2xl font-bold text-white">
                        {distribution.summary.reduce((sum, s) => sum + s.endCensus, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!distribution && (
                <div className="mt-6 text-center text-gray-400 py-8">
                  <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Run calculation to see distribution results</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: Assignment Order Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">Patient-by-Patient Assignment Order</h2>
              
              {distribution && distribution.assignmentOrder && distribution.assignmentOrder.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm text-blue-200">
                      This shows the exact order in which patients were assigned to rounders by the algorithm. 
                      Use this to understand the sequential decision-making process.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-700">
                          <th className="text-center py-3 px-3 bg-gray-700/50">#</th>
                          <th className="text-left py-3 px-3 bg-gray-700/50">Patient ID (No PHI)</th>
                          <th className="text-left py-3 px-3 bg-gray-700/50">Patient Floor</th>
                          <th className="text-left py-3 px-3 bg-gray-700/50">→ Assigned To</th>
                          <th className="text-left py-3 px-3 bg-gray-700/50">Rounder's Floor</th>
                          <th className="text-left py-3 px-3 bg-gray-700/50">Assignment Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distribution.assignmentOrder.map((assignment, idx) => (
                          <tr 
                            key={idx} 
                            className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                              idx % 2 === 0 ? 'bg-gray-800/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-bold text-blue-400">
                              {assignment.order}
                            </td>
                            <td className="py-3 px-3 font-medium">
                              {assignment.patientId}
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-gray-600 px-2 py-1 rounded text-xs">
                                {assignment.floor}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-green-400">
                                {assignment.assignedTo}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="bg-gray-600 px-2 py-1 rounded text-xs">
                                {assignment.assignedFloor}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                assignment.reason === 'geo_match_within_quota' 
                                  ? 'bg-green-700 text-green-200' 
                                  : assignment.reason === 'proportional_within_quota'
                                  ? 'bg-purple-700 text-purple-200'
                                  : 'bg-orange-700 text-orange-200'
                              }`}>
                                {assignment.reasonLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-700 p-3 rounded border border-gray-600">
                      <p className="text-xs text-gray-400 mb-1">Total Patients Assigned</p>
                      <p className="text-2xl font-bold text-white">{distribution.assignmentOrder.length}</p>
                    </div>
                    <div className="bg-green-700/30 p-3 rounded border border-green-600">
                      <p className="text-xs text-green-300 mb-1">Geographic Matches</p>
                      <p className="text-2xl font-bold text-green-400">{distribution.metrics.geoMatches}</p>
                    </div>
                    <div className="bg-purple-700/30 p-3 rounded border border-purple-600">
                      <p className="text-xs text-purple-300 mb-1">Proportional/Overflow</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {distribution.metrics.proportionalAssignments + distribution.metrics.overflowAssignments}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No assignments yet</p>
                  <p className="text-sm mt-1">Run the distribution calculator first</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flow Chart Tab - continues with existing code... */}
        {activeTab === 'sankey' && (
          <div className="space-y-4 flow-chart-container">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-400">Patient Flow Visualization</h2>
                {distribution && (
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors no-print text-white font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF / Print
                  </button>
                )}
              </div>
              
              {distribution ? (
                <div className="space-y-6">
                  <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded no-print">
                    <div className="flex gap-3 items-start">
                      <Download className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <strong className="text-blue-300">How to save as PDF:</strong>
                        <span className="text-blue-200 ml-2">
                          Click the green button above, then in the print dialog select "Save as PDF" as your destination/printer.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="print-only mb-6">
                    <h1 className="text-2xl font-bold mb-2">Belleville Memorial Hospital</h1>
                    <h2 className="text-xl mb-1">Admission Distribution Report</h2>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    <p className="text-sm text-gray-600">By: Akash Venkataramanan</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-700 border-2 border-blue-500 p-3 rounded">
                      <p className="text-xs text-blue-100 mb-1 font-semibold">Total Census Start</p>
                      <p className="text-2xl font-bold text-white">{distribution.summary.reduce((sum, s) => sum + s.startCensus, 0)}</p>
                    </div>
                    <div className="bg-green-700 border-2 border-green-500 p-3 rounded">
                      <p className="text-xs text-green-100 mb-1 font-semibold">Pool Distributed</p>
                      <p className="text-2xl font-bold text-white">{distribution.summary.reduce((sum, s) => sum + s.newAdmissions, 0)}</p>
                    </div>
                    <div className="bg-purple-700 border-2 border-purple-500 p-3 rounded">
                      <p className="text-xs text-purple-100 mb-1 font-semibold">Total Census End</p>
                      <p className="text-2xl font-bold text-white">{distribution.summary.reduce((sum, s) => sum + s.endCensus, 0)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-600 border-2 border-green-400 p-3 rounded">
                      <p className="text-xs text-green-100 font-semibold mb-1">Geographic Matches</p>
                      <p className="text-xl font-bold text-white">{distribution.metrics.geoMatches}</p>
                    </div>
                    <div className="bg-purple-600 border-2 border-purple-400 p-3 rounded">
                      <p className="text-xs text-purple-100 font-semibold mb-1">Proportional</p>
                      <p className="text-xl font-bold text-white">{distribution.metrics.proportionalAssignments}</p>
                    </div>
                    <div className="bg-orange-600 border-2 border-orange-400 p-3 rounded">
                      <p className="text-xs text-orange-100 font-semibold mb-1">Overflow</p>
                      <p className="text-xl font-bold text-white">{distribution.metrics.overflowAssignments}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[600px]">
                      {distribution.summary.map(s => (
                        <div key={s.rounderId} className="flex items-center gap-4 mb-3 flow-chart-item">
                          <div className="w-32 text-right">
                            <div className="text-sm font-medium">{s.rounderName}</div>
                            <div className="text-xs text-gray-400">{s.floor}</div>
                          </div>
                          
                          <div className="flex items-center">
                            <div className="bg-blue-600 px-3 py-2 rounded text-sm font-semibold min-w-[50px] text-center text-white">
                              {s.startCensus}
                            </div>
                          </div>

                          <div className="flex items-center flex-1">
                            <div className="h-0.5 bg-gradient-to-r from-blue-500 to-green-500 flex-1 min-w-[100px]"></div>
                            {s.newAdmissions > 0 && (
                              <div className="bg-green-600 px-2 py-1 rounded text-xs font-semibold mx-2 text-white">
                                +{s.newAdmissions}
                              </div>
                            )}
                            <div className="h-0.5 bg-gradient-to-r from-green-500 to-purple-500 flex-1 min-w-[100px]"></div>
                          </div>

                          <div className="flex items-center">
                            <div className={`px-3 py-2 rounded text-sm font-semibold min-w-[50px] text-center text-white ${
                              s.hitCap ? 'bg-red-600' : 'bg-purple-600'
                            }`}>
                              {s.endCensus}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      <span>Starting Census</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-600 rounded"></div>
                      <span>Pool Assignments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-600 rounded"></div>
                      <span>Under Cap</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600 rounded"></div>
                      <span>At/Over Cap</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Calculate distribution first to see patient flow</p>
                  <p className="text-sm mt-1">Go to Distribution tab and run the calculator</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Algorithm Guide Tab - keeping existing... */}
        {activeTab === 'legend' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">Simplified Slack-Based Distribution Algorithm</h2>
              <p className="text-gray-300">See full algorithm documentation in the original version...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalAdmissionTool;