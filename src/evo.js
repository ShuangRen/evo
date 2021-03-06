import observer from '@nx-js/observer-util'
import { compileToFunctions } from './parser'
import { h, VNode, patch, createElement } from './vdom'
import {
    bind, noop, warn, query, getOuterHTML, idToTemplate, toString, isObject, resolveAsset
} from './util'

export class Evo {
    constructor(options) {

        this.$options = options

        callHook(this, 'beforeCreate')

        if (options.data) {
            initData(this, options.data)
        }

        if (options.methods) {
            initMethods(this, options.methods)
        }

        callHook(this, 'created')

        this.$mount(options.el)
    }

    $mount(el) {
        let options = this.$options
        this.$el = el = el && query(el)

        if (!options.render) {
            let template = options.template
            if (template) {
                if (typeof template === 'string') {
                    if (template[0] === '#') {
                        template = idToTemplate(template)
                    }
                } else if (template.nodeType) {
                    template = template.innerHTML
                }
            } else if (el) {
                template = getOuterHTML(el)
            }
            if (template) {
                const render = compileToFunctions(template, this)
                options.render = render
            }
        }

        callHook(this, 'beforeMount')

        if (!options._isComponent) {
            observer.observe(() => {
                this._update(this._render())
            })
        }

        if (!this._vnode) {
            this._isMounted = true
            callHook(this, 'mounted')
        }

        return this
    }

    $forceUpdate() {
        this._update(this._render())
    }

    _render() {
        let render = this.$options.render
        let vnode
        try {
            vnode = render.call(this, h)
        } catch (e) {
            warn(`render Error : ${e}`)
        }
        return vnode
    }

    _update(vnode) {
        if (this._isMounted) {
            callHook(this, 'beforeUpdate')
        }
        const prevVnode = this._vnode || this.$options._vnode
        this._vnode = vnode

        if (!prevVnode) {
            this.$el = this._patch(this.$el, vnode)
        } else {
            this.$el = this._patch(prevVnode, vnode)
        }

        if (this._isMounted) {
            callHook(this, 'updated')
        }
    }

    _createComponent(Ctor, data, children, sel) {
        Ctor._isComponent = true
        let Factory = this.constructor
        let parentData = this.$data

        data.hook.init = (vnode) => {
            Ctor.data = Ctor.data || {}

            let componentVm = new Factory(Ctor)

            for (let key in data.attrs) {
                Object.defineProperty(componentVm, key, {
                    configurable: true,
                    enumerable: true,
                    get: function proxyGetter() {
                        return parentData[key]
                    }
                })
            }

            observer.observe(() => {
                componentVm.$forceUpdate()
            })

            vnode._component = componentVm
        }

        Ctor._vnode = new VNode(`vue-component-${sel}`, data, [], undefined, createElement(sel))
        return Ctor._vnode
    }

    _patch = patch
    _s = toString

    _k(eventKeyCode, key, builtInAlias) {
        const keyCodes = builtInAlias
        if (Array.isArray(keyCodes)) {
            return keyCodes.indexOf(eventKeyCode) === -1
        } else {
            return keyCodes !== eventKeyCode
        }
    }

    _h(sel, data, children) {
        data = data || {}

        if (Array.isArray(data)) {
            children = data
            data = {}
        }

        data.hook = data.hook || {}

        if (this.$options.destroy) {
            data.hook.destroy = bind(this.$options.destroy, this)
        }

        if (Array.isArray(children)) {
            let faltChildren = []

            children.forEach((item) => {
                if (Array.isArray(item)) {
                    faltChildren = faltChildren.concat(item)
                } else {
                    faltChildren.push(item)
                }
            })

            children = faltChildren.length ? faltChildren : children
        }

        if (typeof sel == 'string') {
            let Ctor = resolveAsset(this.$options, 'components', sel)
            if (Ctor) {
                return this._createComponent(Ctor, data, children, sel)
            }
        }

        return h(sel, data, children)
    }

    _l(val, render) {
        let ret, i, l, keys, key
        if (Array.isArray(val) || typeof val === 'string') {
            ret = new Array(val.length)
            for (i = 0, l = val.length; i < l; i++) {
                ret[i] = render(val[i], i)
            }
        } else if (typeof val === 'number') {
            ret = new Array(val)
            for (i = 0; i < val; i++) {
                ret[i] = render(i + 1, i)
            }
        } else if (isObject(val)) {
            keys = Object.keys(val)
            ret = new Array(keys.length)
            for (i = 0, l = keys.length; i < l; i++) {
                key = keys[i]
                ret[i] = render(val[key], key, i)
            }
        }
        return ret
    }
}

function callHook(vm, hook) {
    const handlers = vm.$options[hook]
    if (handlers) {
        handlers.call(vm)
    }
}

function initData(vm, data) {
    vm.$data = observer.observable(data)

    const keys = Object.keys(data)
    let i = keys.length
    while (i--) {
        proxy(vm, keys[i])
    }
}

function proxy(vm, key) {
    Object.defineProperty(vm, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter() {
            return vm.$data[key]
        },
        set: function proxySetter(val) {
            vm.$data[key] = val
        }
    })
}

function initMethods(vm, methods) {
    for (const key in methods) {
        vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
    }
}