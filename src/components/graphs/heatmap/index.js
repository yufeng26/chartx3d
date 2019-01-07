import { GraphObject, _ } from '../graph';
import { FaceNames } from '../../../constants';
import { Vector3, PlaneGeometry, MeshLambertMaterial, MeshBasicMaterial, MeshPhongMaterial, BoxGeometry, Mesh, FrontSide, DoubleSide, Texture, RepeatWrapping, LinearFilter, BufferGeometry, Float32BufferAttribute, Math as _Math, Color } from 'mmgl/src/index';
import { RenderFont } from '../../../framework/renderFont';
import { hexToRgba } from '../../../../utils/tools'

let __mouseover_heatmapEvent = null, __mouseout_heatmapEvent = null, __mousemove_heatmapEvent = null, __click_heatmapEvemt = null
class Heatmap extends GraphObject {
    constructor(chart3d, opt) {
        super(chart3d);


        this.type = "heatmap";
        this._type = "heatmap3d";

        this.face = 'front'   //绘制在box的那个面上

        this.area = { //填充
            shapeType: "rect",
            enabled: 1,
            fillStyle: null,
            alpha: 1.0,
            highColor: 'yellow'
        };
        this.label = {
            enabled: 1,
            fillStyle: '#333',
            fontSize: 16,
        }

        this.gap = 1;

        _.extend(true, this, opt);

        this.name = "Heatmap_" + this.face;
        this.init();
        this.setGroupName('heatmap_root_' + this.face);

    }
    init() {


        this.planeGroup = this._root.app.addGroup({
            name: 'plane_groups'
        });
        this.textGroup = this._root.app.addGroup({
            name: 'text_groups'
        });
        this.group.add(this.planeGroup);
        this.group.add(this.textGroup);

        let {
            width,
            height,
            depth } = this._coordSystem.getGraphAreaSize();

        if (this.face === FaceNames.BACK) {
            this.group.rotateY(_Math.degToRad(180));
            this.group.translateZ(height);
            this.group.translateX(-width);
        }

        if (this.face === FaceNames.TOP) {
            this.group.rotateX(_Math.degToRad(-90));
            this.group.translateY(-height);
        }

        if (this.face === FaceNames.BOTTOM) {
            this.group.rotateX(_Math.degToRad(90));
            this.group.translateZ(height);
        }

        if (this.face === FaceNames.RIGHT) {
            this.group.rotateY(_Math.degToRad(90));

            this.group.translateX(-width * 0.5 - height * 0.5);
            this.group.translateZ(height * 0.5);

        }
        if (this.face === FaceNames.LEFT) {
            this.group.rotateY(_Math.degToRad(-90));

            this.group.translateX(width * 0.5 - height * 0.5);
            this.group.translateZ(height * 0.5 + width * 0.5);

        }

        this._initData();

    }
    _initData() {
        this.xAttr = this._coordSystem.xAxisAttribute;
        this.yAttr = this._coordSystem.yAxisAttribute;
        this.zAttr = this._coordSystem.zAxisAttribute;
        let xData = this.xAttr.dataSectionLayout;
        let yData = this.yAttr.dataSectionLayout;
        let zData = this.zAttr.dataSectionLayout;
        let data1 = [], data2 = [];
        let dataFrame = this._root.dataFrame;
        this.drawData = [];
        let origin = this._coordSystem.getOriginPosition(this.face.toLowerCase());
       

        if (this.face === FaceNames.FRONT) {
            data1 = xData.concat([]);
            data1.attr = this.xAttr;
            data2 = yData.concat([]);
            data2.attr = this.yAttr;

        }
        if (this.face === FaceNames.BACK) {
            data1 = xData.concat([]);
            data1.attr = this.xAttr;
            data2 = yData.concat([]);
            data2.attr = this.yAttr;
        }

        if (this.face === FaceNames.TOP) {
            data1 = xData.concat([]);
            data1.attr = this.xAttr;
            data2 = zData.concat([]);
            data2.attr = this.zAttr;
        }

        if (this.face === FaceNames.BOTTOM) {
            data1 = xData.concat([]);
            data1.attr = this.xAttr;
            data2 = zData.concat([]);
            data2.attr = this.zAttr;
        }

        if (this.face === FaceNames.RIGHT) {
            data1 = zData.concat([]);
            data1.attr = this.zAttr;
            data2 = yData.concat([]);
            data2.attr = this.yAttr;

        }
        if (this.face === FaceNames.LEFT) {
            data1 = zData.concat([]);
            data1.attr = this.zAttr;
            data2 = yData.concat([]);
            data2.attr = this.yAttr;

        }


        data1.forEach((xd, xi) => {
            data2.forEach((yd, yi) => {
                let rowDatas = dataFrame.getRowDataOf({
                    [data1.attr.field]: xd.val,
                    [data2.attr.field]: yd.val
                });
                if(!rowDatas.length) return;
                let score = rowDatas[0][this.field] || 1;

                this.drawData.push({
                    value: score,
                    color: hexToRgba(this.colorScheme, score * 0.1),
                    rowData: rowDatas[0],
                    field: this.field,
                    iNode: xi + yi,
                    face: this.face,
                    data: rowDatas[0],
                    pos: new Vector3(xd.pos, yd.pos, 0).add(origin),
                    width: data1.attr.getCellLength() - this.gap * 2,
                    height: data2.attr.getCellLength() - this.gap * 2
                })
            })
        })
    }


    draw() {
        let app = this._root.app;

        this.drawData.forEach((item, i) => {

            let score = item.data[this.field] || 0.5;
            let materials = this.getMaterial(this.colorScheme, score);

            let planetGeometry = new PlaneGeometry(item.width, item.height);
            let plane = new Mesh(planetGeometry, materials);
            plane.userData.info = item;
            plane.name = Heatmap._heatmap_plane_prefix + this.face + '_' + i;
            plane.position.copy(item.pos);

            this.planeGroup.add(plane);
            //写文字
            if (item.data[this.field]) {
                let labels = this.createText(item.data[this.field], { fontSize: this.label.fontSize, fillStyle: this.label.fillStyle });
                let pos = item.pos.clone();

                labels[0].position.copy(pos);
                this.textGroup.add(labels[0]);
            }


        });

        this.bindEvent();
    }
    bindEvent() {
        let me = this;
        let isTrigger = function () {
            return me._coordSystem.getDirection() === me.face.toLowerCase();
        }
        __mouseover_heatmapEvent = function (e) {
            if (!isTrigger()) return;
            //let score = this.userData.info.data[me.field] || 1;
            this.material = me.getMaterial(me.colorScheme, 10, me.area.highColor);
            this.material.needsUpdate = true;
            me._root.fire({
                type: 'tipShow',
                event: e.event,
                data: this.userData.info
            });

            me.fire({ type: 'planeover', data: this.userData.info });
        };
        __mouseout_heatmapEvent = function (e) {
            if (!isTrigger()) return;
            let score = this.userData.info.data[me.field] || 1;
            if (!this.userData.select) {
                this.material = me.getMaterial(me.colorScheme, score);
                this.material.needsUpdate = true;
            }


            me._root.fire({
                type: 'tipHide',
                event: e.event,
                data: this.userData.info
            });
            me.fire({ type: 'planeout', data: this.userData.info });
        };

        __mousemove_heatmapEvent = function (e) {
            if (!isTrigger()) return;
            me._root.fire({
                type: 'tipMove',
                event: e.event,
                data: this.userData.info
            });
            me.fire({ type: 'planemove', data: this.userData.info });
        }

        __click_heatmapEvemt = function (e) {
            if (!isTrigger()) return;

            me.cancelSelect();
            if (!e.target.userData.select) {
                this.material = me.getMaterial(me.colorScheme, 10, me.area.highColor);
                this.material.needsUpdate = true;
                e.target.userData.select = true;
            }
            me._coordSystem.fire({ type: 'planeclick', data: this.userData.info });
        }

        this.group.traverse(obj => {
            if (obj.name && obj.name.includes(Heatmap._heatmap_plane_prefix + this.face)) {
                obj.on('mouseover', __mouseover_heatmapEvent);
                obj.on('mouseout', __mouseout_heatmapEvent);

                obj.on('mousemove', __mousemove_heatmapEvent);
                obj.on('click', __click_heatmapEvemt);
            }
        });
    }
    getMaterial(colorScheme, score, highColor) {
        this.materialMap = this.materialMap || {};
        let key = highColor ? highColor : colorScheme + score;
        if (this.materialMap[key]) {
            return this.materialMap[key];
        }
        this.materialMap[key] = new MeshPhongMaterial({
            color: (highColor ? highColor : colorScheme || 0xffffff),
            side: FrontSide,
            transparent: true,
            opacity: score * 0.1,
            depthTest: true,
            depthWrite: false

        });
        return this.materialMap[key];
    }
    createText(texts, fontStyle) {
        let labels = [];

        let renderFont = new RenderFont(fontStyle);

        if (!_.isArray(texts)) {
            texts = [texts];
        }

        let labelInfos = renderFont.drawTexts(texts);

        var position = new Float32Array([
            - 0.5, - 0.5, 0,
            0.5, - 0.5, 0,
            0.5, 0.5, 0,
            - 0.5, 0.5, 0,
        ]);

        let texture = new Texture();
        texture.image = renderFont.canvas;

        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.anisotropy = 1;
        texture.needsUpdate = true;

        let textMatrial = new MeshPhongMaterial({
            color: fontStyle.fillStyle,
            map: texture,
            transparent: true,
            // polygonOffset: true,
            // polygonOffsetFactor: 1,
            // polygonOffsetUnits: 0.5,
            depthWrite: false
        });

        let geometry = new BufferGeometry();
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        geometry.addAttribute('position', new Float32BufferAttribute(position, 3, false))


        texts.forEach((text, index) => {
            geometry.addAttribute('uv', new Float32BufferAttribute(labelInfos.UVs[text], 2, false));
            let realSize = labelInfos.sizes[text];
            //realSize==[width,height]
            let scale = new Vector3(realSize[0] / realSize[1], 1, 1);
            scale.multiplyScalar(realSize[1]);
            let txtObj = new Mesh(geometry, textMatrial);

            txtObj.scale.copy(scale);
            txtObj.userData = {
                text: text,
                size: realSize,
                maxWidth: labelInfos.maxWidth,
                maxHeight: labelInfos.maxHeight
            }

            //默认不进行裁剪
            txtObj.frustumCulled = false;
            labels.push(txtObj);

        })


        return labels;
    }
    cancelSelect() {
        this.group.traverse(obj => {
            if (obj.name && obj.name.includes(Heatmap._heatmap_plane_prefix + this.face)) {
                let score = obj.userData.info.data[this.field] || 1;
                if (obj.userData.select !== false) {
                    obj.userData.select = false;
                    obj.material = this.getMaterial(this.colorScheme, score);
                    obj.material.needsUpdate = true;
                }
            }
        });
    }
    dispose(group) {

        //删除所有事件
        group = group || this.group;
        group.traverse(obj => {
            if (obj.name && obj.name.includes(Heatmap._heatmap_plane_prefix + this.face)) {
                obj.off('mouseover', __mouseover_heatmapEvent);
                obj.off('mouseout', __mouseout_heatmapEvent);

                obj.off('mousemove', __mousemove_heatmapEvent);
                obj.off('click', __click_heatmapEvemt);
            }
        })

        super.dispose(group);
    }

    resetData() {
        this._initData();
        this.materialMap = {};
        this.dispose();
        this.draw();
    }
    static get _heatmap_plane_prefix() {
        return 'heatmap_one_plane_'
    }
}

export default Heatmap;