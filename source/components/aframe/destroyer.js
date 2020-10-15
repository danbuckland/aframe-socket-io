AFRAME.registerComponent('destroyer', {
  schema: {
    ttl: {type: 'number', default: 60},
    birth: {type: 'number'}
  },

  multiple: true,

  init: function () {
    this.el.setAttribute(this.attrName, 'birth', window.CLOCK.getElapsedTime());
    console.log(`ttl is ${this.data.ttl}`);
  },

  tick: function () {
    if (window.CLOCK.getElapsedTime() - this.data.birth > this.data.ttl) {
      console.log('Destroying element');
      this.el.parentNode.removeChild(this.el);
    }
  }
});