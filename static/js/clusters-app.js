// Clean JavaScript with no Hugo template syntax - VS Code friendly!

let clustersData = [];

class CapacitiesVisualization {
    constructor() {
        this.currentCluster = null;
        this.svg = d3.select('#network-svg');
        this.width = 0;
        this.height = 0;
        this.simulation = null;
        
        this.init();
    }

    async init() {
        try {
            // Fetch cluster data from JSON endpoint
            const response = await fetch('/clusters.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            clustersData = await response.json();
            
            console.log('Clusters loaded:', clustersData.length);
            console.log('Cluster data:', clustersData);
            
            if (clustersData.length === 0) {
                this.showNoDataMessage();
                return;
            }
            
            this.populateClusterList();
            this.createFloatingThumbnails();
            this.setupEventListeners();
            this.startFloatingAnimation();
            
        } catch (error) {
            console.error('Error loading cluster data:', error);
            this.showErrorMessage(error.message);
        }
    }

    showNoDataMessage() {
        const clusterList = document.getElementById('cluster-list');
        clusterList.innerHTML = '<li style="color: #cbd5e1; padding: 20px; text-align: center;">No clusters found. Add cluster content to content/clusters/</li>';
        
        const container = document.getElementById('thumbnails-container');
        container.innerHTML = '<div style="color: #cbd5e1; padding: 50px; text-align: center; font-size: 1.2rem;">Add cluster content files to see the visualization</div>';
    }

    showErrorMessage(message) {
        const clusterList = document.getElementById('cluster-list');
        clusterList.innerHTML = `<li style="color: #ef4444; padding: 20px; text-align: center;">Error loading data: ${message}</li>`;
        
        const container = document.getElementById('thumbnails-container');
        container.innerHTML = `<div style="color: #ef4444; padding: 50px; text-align: center; font-size: 1.2rem;">Error: ${message}</div>`;
    }

    populateClusterList() {
        const clusterList = document.getElementById('cluster-list');
        clusterList.innerHTML = '';
        
        clustersData.forEach((cluster, index) => {
            const li = document.createElement('li');
            li.className = 'cluster-item';
            
            const link = document.createElement('a');
            link.className = 'cluster-link';
            link.href = '#';
            link.dataset.clusterId = index;
            
            link.innerHTML = `
                <div class="cluster-title">${cluster.title}</div>
                <div class="cluster-description">${cluster.description}</div>
            `;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.openClusterModal(index);
            });
            
            li.appendChild(link);
            clusterList.appendChild(li);
        });
    }

    createFloatingThumbnails() {
        const container = document.getElementById('thumbnails-container');
        container.innerHTML = '';
        
        clustersData.forEach((cluster, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'floating-thumbnail';
            thumbnail.dataset.clusterId = index;
            
            // Use position from data or random
            const containerWidth = container.clientWidth || window.innerWidth * 0.8;
            const containerHeight = container.clientHeight || window.innerHeight;
            
            const x = cluster.position_x ? 
                cluster.position_x * containerWidth : 
                Math.random() * (containerWidth - 120);
            const y = cluster.position_y ? 
                cluster.position_y * containerHeight + 100 :
                Math.random() * (containerHeight - 200) + 100;
            
            thumbnail.style.left = Math.max(0, x) + 'px';
            thumbnail.style.top = Math.max(100, y) + 'px';
            
            if (cluster.image && cluster.image !== '' && cluster.image !== '/images/') {
                const img = document.createElement('img');
                img.src = cluster.image;
                img.alt = cluster.title;
                img.onerror = () => {
                    thumbnail.innerHTML = `<div class="thumbnail-fallback">${cluster.title}</div>`;
                };
                thumbnail.appendChild(img);
            } else {
                const fallback = document.createElement('div');
                fallback.className = 'thumbnail-fallback';
                fallback.textContent = cluster.title;
                thumbnail.appendChild(fallback);
            }
            
            thumbnail.addEventListener('click', () => {
                this.openClusterModal(index);
            });
            
            container.appendChild(thumbnail);
        });
    }

    startFloatingAnimation() {
        const thumbnails = document.querySelectorAll('.floating-thumbnail');
        
        thumbnails.forEach((thumbnail, index) => {
            const duration = 20000 + (index * 5000);
            const delay = index * 2000;
            thumbnail.style.animation = `float ${duration}ms ${delay}ms infinite ease-in-out`;
        });

        // Add CSS animation if not already added
        if (!document.querySelector('#float-animation')) {
            const style = document.createElement('style');
            style.id = 'float-animation';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
                    25% { transform: translateY(-20px) rotate(2deg); opacity: 0.9; }
                    50% { transform: translateY(0px) rotate(0deg); opacity: 1; }
                    75% { transform: translateY(-15px) rotate(-2deg); opacity: 0.9; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupEventListeners() {
        // Close modal
        const closeModal = document.getElementById('close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeClusterModal();
            });
        }

        // Close capacity detail
        const closeDetail = document.getElementById('close-detail');
        if (closeDetail) {
            closeDetail.addEventListener('click', () => {
                this.closeCapacityDetail();
            });
        }

        // Close on outside click
        const modal = document.getElementById('cluster-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'cluster-modal') {
                    this.closeClusterModal();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const capacityDetail = document.getElementById('capacity-detail');
                const clusterModal = document.getElementById('cluster-modal');
                
                if (capacityDetail && capacityDetail.classList.contains('active')) {
                    this.closeCapacityDetail();
                } else if (clusterModal && clusterModal.classList.contains('active')) {
                    this.closeClusterModal();
                }
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.currentCluster !== null) {
                this.updateNetworkDimensions();
                this.drawNetwork();
            }
        });
    }

    openClusterModal(clusterId) {
        this.currentCluster = clusterId;
        const cluster = clustersData[clusterId];
        
        document.getElementById('modal-title').textContent = cluster.title;
        document.getElementById('modal-description').textContent = cluster.description;
        
        // Add why matters section
        const whyMatters = document.getElementById('why-matters');
        if (cluster.why_matters && cluster.why_matters.trim() !== '') {
            whyMatters.innerHTML = `<h4>Why This Cluster Matters:</h4><p>${cluster.why_matters}</p>`;
            whyMatters.style.display = 'block';
        } else {
            whyMatters.style.display = 'none';
        }
        
        document.getElementById('cluster-modal').classList.add('active');
        
        // Small delay to ensure modal is visible before drawing
        setTimeout(() => {
            this.updateNetworkDimensions();
            this.drawNetwork();
        }, 100);
    }

    closeClusterModal() {
        const modal = document.getElementById('cluster-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.closeCapacityDetail();
        this.currentCluster = null;
        if (this.simulation) {
            this.simulation.stop();
        }
        this.svg.selectAll("*").remove();
    }

    updateNetworkDimensions() {
        const container = document.querySelector('.network-container');
        if (container) {
            this.width = container.clientWidth;
            this.height = container.clientHeight - 120;
            this.svg.attr('width', this.width).attr('height', this.height);
        }
    }

    drawNetwork() {
        if (this.currentCluster === null || !clustersData[this.currentCluster]) return;
        
        const cluster = clustersData[this.currentCluster];
        this.svg.selectAll("*").remove();

        // Define gradients
        const defs = this.svg.append('defs');
        
        const centralGradient = defs.append('radialGradient')
            .attr('id', 'centralGradient');
        centralGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#a855f7')
            .attr('stop-opacity', 0.8);
        centralGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#1e293b')
            .attr('stop-opacity', 0.9);

        // Prepare data for D3
        const nodes = [
            {
                id: 'center',
                title: cluster.title,
                type: 'cluster',
                x: this.width / 2,
                y: this.height / 2,
                fx: this.width / 2,
                fy: this.height / 2
            }
        ];

        const links = [];

        if (cluster.capacities && cluster.capacities.length > 0) {
            cluster.capacities.forEach((capacity, index) => {
                const nodeId = `capacity-${index}`;
                nodes.push({
                    id: nodeId,
                    title: capacity.title,
                    subtitle: capacity.subtitle,
                    type: 'capacity',
                    capacity: capacity,
                    color: capacity.color || '#8b5cf6'
                });

                links.push({
                    source: 'center',
                    target: nodeId
                });
            });
        }

        // Create force simulation
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(60));

        // Draw links with organic curves
        const link = this.svg.append('g')
            .selectAll('path')
            .data(links)
            .enter().append('path')
            .attr('stroke', '#8b5cf6')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6)
            .attr('fill', 'none');

        // Draw nodes
        const node = this.svg.append('g')
            .selectAll('g')
            .data(nodes)
            .enter().append('g')
            .call(d3.drag()
                .on('start', this.dragstarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragended.bind(this)));

        // Center node (cluster)
        node.filter(d => d.type === 'cluster')
            .append('circle')
            .attr('r', 50)
            .attr('fill', 'url(#centralGradient)')
            .attr('stroke', '#a855f7')
            .attr('stroke-width', 3);

        // Center node text with better wrapping
        node.filter(d => d.type === 'cluster')
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('fill', '#ffffff')
            .attr('font-weight', 'bold')
            .attr('font-size', '12px')
            .each(function(d) {
                const words = d.title.split(' ');
                const lineHeight = 1.2;
                let line = [];
                let lineNumber = 0;
                const y = 0;
                const dy = 0;
                
                if (words.length === 1) {
                    d3.select(this).text(d.title);
                    return;
                }
                
                words.forEach((word, i) => {
                    line.push(word);
                    const testText = line.join(' ');
                    if (testText.length > 12 && line.length > 1) {
                        line.pop();
                        d3.select(this)
                            .append('tspan')
                            .attr('x', 0)
                            .attr('y', y)
                            .attr('dy', (lineNumber * lineHeight - 0.3) + 'em')
                            .text(line.join(' '));
                        line = [word];
                        lineNumber++;
                    }
                });
                
                if (line.length > 0) {
                    d3.select(this)
                        .append('tspan')
                        .attr('x', 0)
                        .attr('y', y)
                        .attr('dy', (lineNumber * lineHeight - 0.3) + 'em')
                        .text(line.join(' '));
                }
            });

        // Capacity nodes
        const capacityNodes = node.filter(d => d.type === 'capacity');

        capacityNodes.append('circle')
            .attr('r', 35)
            .attr('fill', d => d.color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .on('mouseover', function() {
                d3.select(this).transition().duration(200).attr('r', 38);
            })
            .on('mouseout', function() {
                d3.select(this).transition().duration(200).attr('r', 35);
            });

        capacityNodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-5')
            .attr('fill', '#ffffff')
            .attr('font-weight', 'bold')
            .attr('font-size', '10px')
            .style('cursor', 'pointer')
            .text(d => d.title && d.title.length > 12 ? d.title.substring(0, 12) + '...' : d.title || '');

        capacityNodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '8')
            .attr('fill', '#ffffff')
            .attr('font-size', '8px')
            .attr('opacity', 0.8)
            .style('cursor', 'pointer')
            .text(d => d.subtitle && d.subtitle.length > 15 ? d.subtitle.substring(0, 15) + '...' : d.subtitle || '');

        // Add click handlers to capacity nodes
        capacityNodes.on('click', (event, d) => {
            if (d.type === 'capacity') {
                this.openCapacityDetail(d.capacity);
            }
        });

        // Update positions on simulation tick
        this.simulation.on('tick', () => {
            // Curved links
            link.attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 0.3;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    openCapacityDetail(capacity) {
        if (!capacity) return;
        
        document.getElementById('capacity-title').textContent = capacity.title || '';
        document.getElementById('capacity-subtitle').textContent = capacity.subtitle || '';
        
        // Handle markdown content
        document.getElementById('capacity-what-it-is').innerHTML = this.parseMarkdown(capacity.what_it_is || '');
        document.getElementById('capacity-why-exiled').innerHTML = this.parseMarkdown(capacity.why_exiled || '');
        document.getElementById('capacity-what-possible').innerHTML = this.parseMarkdown(capacity.what_possible || '');

        const distortionsList = document.getElementById('capacity-distortions');
        distortionsList.innerHTML = '';
        
        if (capacity.distortions && capacity.distortions.length > 0) {
            capacity.distortions.forEach(distortion => {
                const li = document.createElement('li');
                li.className = 'distortion-item';
                li.innerHTML = `
                    <div class="distortion-name">${distortion.name || ''}</div>
                    <div class="distortion-description">${distortion.description || ''}</div>
                `;
                distortionsList.appendChild(li);
            });
        }

        document.getElementById('capacity-detail').classList.add('active');
    }

    closeCapacityDetail() {
        const detail = document.getElementById('capacity-detail');
        if (detail) {
            detail.classList.remove('active');
        }
    }

    parseMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        if (d.type !== 'cluster') {
            d.fx = null;
            d.fy = null;
        }
    }
}

// Initialize the visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CapacitiesVisualization();
});