import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TreePine, Users, UserPlus, Edit3, Search, Filter, Download,
  ChevronRight, ChevronDown, Plus, X, Info, Calendar, MapPin,
  Heart, Star, Award, BookOpen, Camera, Share2, ZoomIn, ZoomOut,
  CheckCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  deathDate?: string;
  gender: 'male' | 'female' | 'other';
  avatar?: string;
  bio?: string;
  occupation?: string;
  location?: string;
  phone?: string;
  email?: string;
  photos?: string[];
  stories?: string[];
  achievements?: string[];
  relationships: {
    spouse?: string[];
    children?: string[];
    parents?: string[];
    siblings?: string[];
  };
  metadata: {
    createdAt?: string;
    updatedAt?: string;
    addedBy?: string;
    verified: boolean;
    privacy: 'public' | 'family' | 'private';
  };
}

interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  rootMember: string;
  members: FamilyMember[];
  relationships: Array<{
    from: string;
    to: string;
    type: 'parent' | 'child' | 'spouse' | 'sibling';
  }>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    public: boolean;
    memberCount: number;
    generationCount: number;
  };
}

interface TreeNode {
  member: FamilyMember;
  children: TreeNode[];
  x: number;
  y: number;
  level: number;
}

const relationshipTypes = [
  { id: 'parent', label: 'Parent', icon: Users },
  { id: 'child', label: 'Child', icon: Users },
  { id: 'spouse', label: 'Spouse', icon: Heart },
  { id: 'sibling', label: 'Sibling', icon: Users },
];

const privacyLevels = [
  { id: 'public', label: 'Public', description: 'Anyone can view' },
  { id: 'family', label: 'Family Only', description: 'Only family members can view' },
  { id: 'private', label: 'Private', description: 'Only you can view' },
];

export function GenealogyTree() {
  const { user, token } = useAuth();
  const [familyTrees, setFamilyTrees] = useState<FamilyTree[]>([]);
  const [selectedTree, setSelectedTree] = useState<FamilyTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'timeline'>('tree');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showTreeEditor, setShowTreeEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [zoom, setZoom] = useState(1);
  const [treeNodes, setTreeNodes] = useState<TreeNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (token) {
      loadFamilyTrees();
    }
  }, [token]);

  const loadFamilyTrees = async () => {
    setLoading(true);
    try {
      const data = await api.getFamilyTrees(token);
      setFamilyTrees(data as FamilyTree[]);
      
      // Select first tree by default
      if (Array.isArray(data) && data.length > 0) {
        setSelectedTree(data[0] as FamilyTree);
        buildTreeStructure(data[0] as FamilyTree);
      }
    } catch (error) {
      console.error('Failed to load family trees:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTreeStructure = (tree: FamilyTree) => {
    // Build hierarchical tree structure from flat member list
    const memberMap = new Map<string, FamilyMember>();
    tree.members.forEach(member => memberMap.set(member.id, member));

    // Find root member
    const rootMember = memberMap.get(tree.rootMember);
    if (!rootMember) return;

    // Build tree recursively
    const buildNode = (member: FamilyMember, level: number = 0): TreeNode => {
      const children: TreeNode[] = [];
      
      // Add children
      member.relationships.children?.forEach(childId => {
        const child = memberMap.get(childId);
        if (child) {
          children.push(buildNode(child, level + 1));
        }
      });

      return {
        member,
        children,
        x: 0,
        y: level * 150,
        level
      };
    };

    const treeStructure = buildNode(rootMember);
    
    // Calculate positions
    calculatePositions(treeStructure);
    setTreeNodes(treeStructure);
  };

  const calculatePositions = (node: TreeNode, x = 400, width = 800) => {
    node.x = x;
    
    if (node.children.length > 0) {
      const childWidth = width / node.children.length;
      node.children.forEach((child, index) => {
        const childX = x - width/2 + childWidth * index + childWidth/2;
        calculatePositions(child, childX, childWidth);
      });
    }
  };

  const createFamilyTree = async (treeData: Partial<FamilyTree>) => {
    try {
      const newTree = await api.createFamilyTree(token, treeData);
      setFamilyTrees(prev => [newTree as FamilyTree, ...prev]);
      setSelectedTree(newTree as FamilyTree);
      setShowTreeEditor(false);
    } catch (error) {
      console.error('Failed to create family tree:', error);
    }
  };

  const addFamilyMember = async (memberData: Partial<FamilyMember>) => {
    if (!selectedTree) return;

    try {
      const newMember = await api.addFamilyMember(token, selectedTree.id, memberData);
      
      // Update local state
      const updatedTree = {
        ...selectedTree,
        members: [...selectedTree.members, newMember as FamilyMember]
      };
      setSelectedTree(updatedTree);
      setFamilyTrees(prev => prev.map(t => t.id === updatedTree.id ? updatedTree : t));
      
      // Rebuild tree structure
      buildTreeStructure(updatedTree);
      setShowAddMember(false);
    } catch (error) {
      console.error('Failed to add family member:', error);
    }
  };

  const updateFamilyMember = async (memberId: string, memberData: Partial<FamilyMember>) => {
    if (!selectedTree) return;

    try {
      const updatedMember = await api.updateFamilyMember(token, selectedTree.id, memberId, memberData);
      
      // Update local state
      const updatedTree = {
        ...selectedTree,
        members: selectedTree.members.map(m => m.id === memberId ? updatedMember as FamilyMember : m)
      };
      setSelectedTree(updatedTree);
      setFamilyTrees(prev => prev.map(t => t.id === updatedTree.id ? updatedTree : t));
      
      // Rebuild tree structure
      buildTreeStructure(updatedTree);
    } catch (error) {
      console.error('Failed to update family member:', error);
    }
  };

  const deleteFamilyMember = async (memberId: string) => {
    if (!selectedTree) return;

    try {
      await api.deleteFamilyMember(token, selectedTree.id, memberId);
      
      // Update local state
      const updatedTree = {
        ...selectedTree,
        members: selectedTree.members.filter(m => m.id !== memberId)
      };
      setSelectedTree(updatedTree);
      setFamilyTrees(prev => prev.map(t => t.id === updatedTree.id ? updatedTree : t));
      
      // Rebuild tree structure
      buildTreeStructure(updatedTree);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to delete family member:', error);
    }
  };

  const exportFamilyTree = async (format: 'json' | 'pdf' | 'png') => {
    if (!selectedTree) return;

    try {
      await api.exportFamilyTree(token, selectedTree.id, format);
    } catch (error) {
      console.error('Failed to export family tree:', error);
    }
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const { member } = node;
    
    return (
      <g key={member.id}>
        {/* Connection lines to children */}
        {node.children.map(child => (
          <line
            key={`line-${member.id}-${child.member.id}`}
            x1={node.x}
            y1={node.y + 40}
            x2={child.x}
            y2={child.y - 40}
            stroke="#94a3b8"
            strokeWidth="2"
          />
        ))}
        
        {/* Member node */}
        <g
          transform={`translate(${node.x}, ${node.y})`}
          onClick={() => setSelectedMember(member)}
          className="cursor-pointer"
        >
          {/* Avatar background */}
          <circle
            cx="0"
            cy="0"
            r="40"
            fill={member.gender === 'male' ? '#3b82f6' : member.gender === 'female' ? '#ec4899' : '#6b7280'}
            stroke="#fff"
            strokeWidth="3"
          />
          
          {/* Avatar */}
          {member.avatar ? (
            <image
              href={member.avatar}
              x="-35"
              y="-35"
              width="70"
              height="70"
              clipPath="circle(40)"
            />
          ) : (
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill="white"
              fontSize="24"
              fontWeight="bold"
            >
              {member.firstName[0]}{member.lastName[0]}
            </text>
          )}
          
          {/* Name */}
          <text
            x="0"
            y="55"
            textAnchor="middle"
            fill="#1f2937"
            fontSize="14"
            fontWeight="600"
          >
            {member.firstName} {member.lastName}
          </text>
          
          {/* Dates */}
          {(member.birthDate || member.deathDate) && (
            <text
              x="0"
              y="72"
              textAnchor="middle"
              fill="#6b7280"
              fontSize="12"
            >
              {member.birthDate ? new Date(member.birthDate).getFullYear() : '?'} - {member.deathDate ? new Date(member.deathDate).getFullYear() : 'Present'}
            </text>
          )}
          
          {/* Verification badge */}
          {member.metadata.verified && (
            <g transform="translate(30, -30)">
              <circle cx="0" cy="0" r="8" fill="#10b981" />
              <path
                d="M -4 0 L -1 3 L 4 -3"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
            </g>
          )}
        </g>
        
        {/* Render children */}
        {node.children.map(child => renderTreeNode(child))}
      </g>
    );
  };

  const filteredMembers = selectedTree?.members.filter(member =>
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <TreePine className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Family Genealogy</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Preserve and explore your family heritage
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTreeEditor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Tree
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tree Selector */}
      {familyTrees.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex gap-4 overflow-x-auto">
              {familyTrees.map((tree) => (
                <button
                  key={tree.id}
                  onClick={() => {
                    setSelectedTree(tree);
                    buildTreeStructure(tree);
                  }}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                    selectedTree?.id === tree.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  <TreePine className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">{tree.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {tree.metadata.memberCount} members
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTree ? (
        <>
          {/* Toolbar */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {/* View Mode Selector */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {[
                      { id: 'tree', label: 'Tree View', icon: TreePine },
                      { id: 'list', label: 'List View', icon: Users },
                      { id: 'timeline', label: 'Timeline', icon: Calendar },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                          viewMode === mode.id
                            ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <mode.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{mode.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search family members..."
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Zoom Controls */}
                  {viewMode === 'tree' && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>

                  <div className="relative">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tree View */}
            {viewMode === 'tree' && treeNodes && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-auto">
                <svg
                  ref={svgRef}
                  width="1200"
                  height="600"
                  viewBox="0 0 1200 600"
                  className="w-full"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                  {renderTreeNode(treeNodes)}
                </svg>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedMember(member)}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                        member.gender === 'male' ? 'bg-blue-500' : 
                        member.gender === 'female' ? 'bg-pink-500' : 'bg-gray-500'
                      }`}>
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={`${member.firstName} ${member.lastName}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          `${member.firstName[0]}${member.lastName[0]}`
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {member.firstName} {member.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.occupation || 'No occupation listed'}
                        </p>
                      </div>
                      {member.metadata.verified && (
                        <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {member.birthDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Born: {new Date(member.birthDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {member.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{member.location}</span>
                        </div>
                      )}
                      {member.bio && (
                        <p className="line-clamp-2">{member.bio}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500">
                        {member.relationships.children?.length || 0} children
                      </span>
                      <span className="text-xs text-gray-500">
                        {member.relationships.spouse?.length || 0} spouse(s)
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <div className="space-y-8">
                {filteredMembers
                  .sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || ''))
                  .map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-6"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${
                          member.gender === 'male' ? 'bg-blue-500' : 
                          member.gender === 'female' ? 'bg-pink-500' : 'bg-gray-500'
                        }`} />
                        {index < filteredMembers.length - 1 && (
                          <div className="w-0.5 h-20 bg-gray-300 dark:bg-gray-700" />
                        )}
                      </div>
                      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </h3>
                          {member.birthDate && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(member.birthDate).getFullYear()}
                            </span>
                          )}
                        </div>
                        {member.bio && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4">{member.bio}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          {member.occupation && <span>{member.occupation}</span>}
                          {member.location && <span>• {member.location}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <TreePine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Family Trees Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start by creating your first family tree to preserve your heritage
            </p>
            <button
              onClick={() => setShowTreeEditor(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Family Tree
            </button>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedMember.firstName} {selectedMember.lastName}
              </h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MemberDetailForm
              member={selectedMember}
              onUpdate={(data) => updateFamilyMember(selectedMember.id, data)}
              onDelete={() => deleteFamilyMember(selectedMember.id)}
              onClose={() => setSelectedMember(null)}
            />
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Family Member
              </h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MemberForm
              onSave={addFamilyMember}
              onCancel={() => setShowAddMember(false)}
            />
          </div>
        </div>
      )}

      {/* Tree Editor Modal */}
      {showTreeEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Create Family Tree
              </h3>
              <button
                onClick={() => setShowTreeEditor(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <TreeForm
              onSave={createFamilyTree}
              onCancel={() => setShowTreeEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Member Form Component
function MemberForm({
  onSave,
  onCancel
}: {
  onSave: (data: Partial<FamilyMember>) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<FamilyMember>>({
    firstName: '',
    lastName: '',
    gender: 'other',
    birthDate: '',
    deathDate: '',
    occupation: '',
    location: '',
    bio: '',
    phone: '',
    email: '',
    relationships: {
      spouse: [],
      children: [],
      parents: [],
      siblings: []
    },
    metadata: {
      privacy: 'family',
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addedBy: user?.id || ''
    }
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gender *
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Birth Date
          </label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Additional Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Occupation
        </label>
        <input
          type="text"
          value={formData.occupation}
          onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Privacy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Privacy Level
        </label>
        <select
          value={formData.metadata?.privacy}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            metadata: { ...prev.metadata!, privacy: e.target.value as any }
          }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {privacyLevels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label} - {level.description}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            'Add Member'
          )}
        </button>
      </div>
    </form>
  );
}

// Tree Form Component
function TreeForm({
  onSave,
  onCancel
}: {
  onSave: (data: Partial<FamilyTree>) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<FamilyTree>>({
    name: '',
    description: '',
    metadata: {
      public: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.id || '',
      memberCount: 0,
      generationCount: 0
    }
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tree Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Smith Family Tree"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="Describe your family tree and its significance..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isPublic"
          checked={formData.metadata?.public}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            metadata: { ...prev.metadata!, public: e.target.checked }
          }))}
          className="rounded text-primary"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
          Make this family tree public (anyone can view)
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating...</span>
            </div>
          ) : (
            'Create Tree'
          )}
        </button>
      </div>
    </form>
  );
}

// Member Detail Form Component
function MemberDetailForm({
  member,
  onUpdate,
  onDelete,
  onClose
}: {
  member: FamilyMember;
  onUpdate: (data: Partial<FamilyMember>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<FamilyMember>>(member);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this family member? This action cannot be undone.')) {
      await onDelete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl ${
          member.gender === 'male' ? 'bg-blue-500' : 
          member.gender === 'female' ? 'bg-pink-500' : 'bg-gray-500'
        }`}>
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={`${member.firstName} ${member.lastName}`}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            `${member.firstName[0]}${member.lastName[0]}`
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {member.firstName} {member.lastName}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {member.occupation && <span>{member.occupation}</span>}
            {member.location && <span>• {member.location}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:text-primary transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-2 text-gray-600 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Details */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">About</h4>
            <p className="text-gray-600 dark:text-gray-400">
              {member.bio || 'No bio available'}
            </p>
          </div>

          {/* Dates */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dates</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {member.birthDate && (
                <div>Born: {new Date(member.birthDate).toLocaleDateString()}</div>
              )}
              {member.deathDate && (
                <div>Died: {new Date(member.deathDate).toLocaleDateString()}</div>
              )}
            </div>
          </div>

          {/* Relationships */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Relationships</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {member.relationships.spouse && member.relationships.spouse.length > 0 && (
                <div>Spouse(s): {member.relationships.spouse.length}</div>
              )}
              {member.relationships.children && member.relationships.children.length > 0 && (
                <div>Children: {member.relationships.children.length}</div>
              )}
              {member.relationships.parents && member.relationships.parents.length > 0 && (
                <div>Parents: {member.relationships.parents.length}</div>
              )}
              {member.relationships.siblings && member.relationships.siblings.length > 0 && (
                <div>Siblings: {member.relationships.siblings.length}</div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Contact</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {member.phone && <div>Phone: {member.phone}</div>}
              {member.email && <div>Email: {member.email}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
